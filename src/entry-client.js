import { includes, isString } from 'lodash-es';

export default function initializeClient(createApp, clientOpts) {
    const opts = Object.assign({
        appSelector: '#app',
        hmr: true,
        initialState: null,
        initialStateMetaTag: 'initial-state',
        vuexModules: true,
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
        const registeredModules = {};

        // Before routing, register any dynamic Vuex modules for new components
        router.beforeResolve((to, from, next) => {
            router.getMatchedComponents(to)
                .filter(c => 'vuex' in c && !registeredModules[c.vuex.moduleName])
                .forEach((c) => {
                    opts.logger.info('Registering dynamic Vuex module:', c.vuex.moduleName);
                    store.registerModule(c.vuex.moduleName, c.vuex.module, {
                        preserveState: store.state[c.vuex.moduleName] != null,
                    });
                    registeredModules[c.vuex.moduleName] = true;
                });
            next();
        });

        // After routing, unregister any dynamic Vuex modules from prior components
        router.afterEach((to, from) => {
            const components = router.getMatchedComponents(to);
            const priorComponents = router.getMatchedComponents(from);

            priorComponents
                .filter(c => !includes(components, c) &&
                             'vuex' in c &&
                             registeredModules[c.vuex.moduleName])
                .forEach((c) => {
                    opts.logger.info('Unregistering dynamic Vuex module:', c.vuex.moduleName);
                    store.unregisterModule(c.vuex.moduleName);
                    registeredModules[c.vuex.moduleName] = false;
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
                    opts.logger.debug(e);
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
