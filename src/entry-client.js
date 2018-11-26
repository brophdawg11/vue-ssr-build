import { find, isString } from 'lodash-es';

export default function initializeClient(createApp, clientOpts) {
    const opts = Object.assign({
        appSelector: '#app',
        hmr: true,
        initialState: null,
        initialStateMetaTag: 'initial-state',
        vuexModules: true,
        maxVuexModules: 2,
        middleware: () => Promise.resolve(),
        postMiddleware: () => Promise.resolve(),
        logger: console,
    }, clientOpts);

    let { initialState } = opts;

    if (isString(opts.initialStateMetaTag)) {
        if (initialState) {
            opts.logger.error('initialState and initialStateMetaTag should not be used together');
        }
        try {
            const meta = document.querySelector(`meta[name="${opts.initialStateMetaTag}"]`);
            initialState = JSON.parse(meta.getAttribute('content'));
        } catch (e) {
            opts.logger.error(`Error parsing meta tag content: ${opts.initialStateMetaTag}`);
        }
    }

    const { app, router, store } = createApp({
        initialState,
    });

    if (opts.vuexModules) {
        // This is a temporary workaround for us to use to prevent re-registering
        // dynamic modules until Vuex implements a hasModule() type method.  See:
        //   https://github.com/vuejs/vuex/issues/833
        //   https://github.com/vuejs/vuex/pull/834
        const registeredModules = [];
        let moduleIndex = 0;

        // Allow a function to be passed that can generate a route-aware
        // module name
        const getModuleName = (c, route) => (
            typeof c.vuex.moduleName === 'function' ?
                c.vuex.moduleName(route) :
                c.vuex.moduleName
        );

        // Before routing, register any dynamic Vuex modules for new components
        router.beforeResolve((to, from, next) => {
            try {
                router.getMatchedComponents(to)
                    .filter(c => 'vuex' in c)
                    .forEach((c) => {
                        const name = getModuleName(c, to);
                        const existingModule = find(registeredModules, { name });
                        if (existingModule) {
                            // We already have this module registered, update the
                            // index to mark it as recent
                            opts.logger.info('Skipping duplicate Vuex module registration:', name);
                            existingModule.index = moduleIndex++;
                        } else {
                            opts.logger.info('Registering dynamic Vuex module:', name);
                            store.registerModule(name, c.vuex.module, {
                                preserveState: store.state[name] != null,
                            });
                            registeredModules.push({ name, index: moduleIndex++ });
                        }
                    });

                next();
            } catch (e) {
                opts.logger.error('Caught error during beforeResolve', e);
                // Prevent routing
                next(e || false);
            }
        });

        // After routing, unregister any dynamic Vuex modules from prior components
        router.afterEach((to, from) => {
            const priorComponents = router.getMatchedComponents(from);

            priorComponents
                .filter(c => 'vuex' in c)
                .forEach((c) => {
                    const fromModuleName = getModuleName(c, from);
                    const toModuleName = getModuleName(c, to);

                    // After every routing operation, perform available cleanup
                    // of registered modules, keeping around up to a specified
                    // maximum
                    const minIndex = Math.max(moduleIndex - opts.maxVuexModules, 0);
                    registeredModules.forEach((m, idx) => {
                        if (m.index < minIndex) {
                            if (m.name !== toModuleName && m.name !== fromModuleName) {
                                opts.logger.info('Unregistering dynamic Vuex module:', m.name);
                                store.unregisterModule(m.name);
                                registeredModules.splice(idx, 1);
                            } else {
                                // Not ready to be removed yet, still actively used
                                opts.logger.info(
                                    'Skipping deregistration for active Vuex module:',
                                    m.name,
                                );
                            }
                        }
                    });
                });
        });
    }

    // Register the fetchData hook once the router is ready since we don't want to
    // re-run fetchData for the SSR'd component
    router.onReady(() => {
        // Prior to resolving a route, execute any component fetchData methods.
        // Approach based on:
        //   https://ssr.vuejs.org/en/data.html#client-data-fetching
        router.beforeResolve((to, from, next) => {
            // For simplicity, since we aren't using nested routes or anything fancy,
            // we will just always call fetchData on the new components.  If we try to
            // route to the same exact route, it shouldn't even fire the beforeResolve.
            // And if we are routing to the same component with new params, then we
            // likely want to be calling fetchData again.  If this proves to be too
            // loose of an approach, a comprehensive approach is available at:
            //   https://ssr.vuejs.org/en/data.html#client-data-fetching
            const components = router.getMatchedComponents(to);
            const fetchData = c => c.fetchData && c.fetchData({
                app,
                route: to,
                router,
                store,
            });
            return Promise.resolve()
                .then(() => opts.middleware(to, from, store))
                .then(() => Promise.all(components.map(fetchData)))
                .then(() => opts.postMiddleware(to, from, store))
                .then(() => next())
                .catch((e) => {
                    opts.logger.error('Error fetching component data, preventing routing');
                    opts.logger.error(e);
                    if (e instanceof Error) {
                        next(e);
                    } else if (typeof e === 'string') {
                        next(new Error(e));
                    } else {
                        try {
                            next(new Error(JSON.stringify(e)));
                        } catch (e2) {
                            next(new Error('Unknown routing error'));
                        }
                    }
                });
        });

        app.$mount(opts.appSelector);
    });

    if (opts.hmr && module.hot) {
        module.hot.accept();
    }

    return { app, router, store };
}
