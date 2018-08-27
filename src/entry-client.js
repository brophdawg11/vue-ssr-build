import { isString } from 'lodash-es';

export default function initializeClient(createApp, clientOpts) {
    const opts = Object.assign({
        appSelector: '#app',
        hmr: true,
        initialState: null,
        initialStateMetaTag: 'initial-state',
        vuexModules: true,
        maxVuexModules: 5,
        middleware: () => Promise.resolve(),
        postMiddleware: () => Promise.resolve(),
        logger: console,
    }, clientOpts);

    let initialState = null;

    if (isString(opts.initialStateMetaTag)) {
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
                        const moduleName = getModuleName(c, to);

                        // Short circuit if we already have this module
                        const idx = registeredModules.indexOf(moduleName);
                        if (idx >= 0) {
                            // Bump this module back to the end of the queue
                            registeredModules.splice(idx, 1);
                            registeredModules.push(moduleName);
                            opts.logger.info(
                                'Skipping duplicate Vuex module registration:',
                                moduleName,
                            );
                            return;
                        }

                        opts.logger.info('Registering dynamic Vuex module:', moduleName);
                        store.registerModule(moduleName, c.vuex.module, {
                            preserveState: store.state[moduleName] != null,
                        });
                        registeredModules.push(moduleName);
                    });
            } catch (e) {
                opts.logger.error('Caught error during beforeResolve', e);
            } finally {
                next();
            }
        });

        // After routing, unregister any dynamic Vuex modules from prior components
        router.afterEach((to, from) => {
            const priorComponents = router.getMatchedComponents(from);

            priorComponents
                .filter(c => 'vuex' in c)
                .forEach((c) => {
                    const toModuleName = getModuleName(c, to);
                    const fromModuleName = getModuleName(c, to);

                    // After every routing operation, perform available cleanup
                    // of registered modules, keeping around up to a specified
                    // maximum
                    const numToRemove = registeredModules.length - opts.maxVuexModules;
                    const eligibleForRemoval = numToRemove > 0 ?
                        registeredModules.splice(0, numToRemove) :
                        [];

                    // Remove in reverse order so we add back in the proper
                    // order if we need to
                    eligibleForRemoval.reverse().forEach((moduleName) => {
                        if (moduleName !== toModuleName && moduleName !== fromModuleName) {
                            opts.logger.info('Unregistering dynamic Vuex module:', moduleName);
                            store.unregisterModule(moduleName);
                        } else {
                            // Not ready to be removed yet, stick back at the beginning
                            // of the queue
                            opts.logger.info(
                                'Skipping deregistration for dynamic Vuex module:',
                                moduleName,
                            );
                            registeredModules.unshift(moduleName);
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
                    } else {
                        next(false);
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
