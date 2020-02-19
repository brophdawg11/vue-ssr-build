import { find, isFunction, isString } from 'lodash-es';

const shouldIgnoreRouteUpdate = (c, args) => (
    isFunction(c.shouldIgnoreRouteUpdate) &&
    c.shouldIgnoreRouteUpdate(args) === true
);

export function perfMeasure() {

}

export default function initializeClient(createApp, clientOpts) {
    const opts = {
        appSelector: '#app',
        hmr: true,
        initialState: null,
        initialStateMetaTag: 'initial-state',
        vuexModules: true,
        maxVuexModules: 2,
        middleware: () => Promise.resolve(),
        postMiddleware: () => Promise.resolve(),
        logger: console,
        perfMarkName: null,
        ...clientOpts,
    };

    window.performance.mark('cat->pdp|start');
    window.performance.measure('cat->pdp|after-fetch-data', 'cat->pdp|start');
    window.performance.measure('cat->pdp|after-animate-out', 'cat->pdp|start');
    window.performance.measure('cat->pdp|after-animate-in', 'cat->pdp|start');


    const ROUTING_MARK_NAME = 'client-side-route';

    function perfInit() {
        if (!window.performance || clientOpts.perfMarkName !== 'function') {
            return;
        }
        console.log('[perf] setting mark');
        window.performance.mark(clientOpts.perfMarkName('start', to, from));
    }

    function perfMeasure(name) {
        if (!window.performance) {
            return;
        }
        const marks = window.performance.getEntriesByName(ROUTING_MARK_NAME);
        if (!marks || marks.length === 0) {
            console.warn('Unable to do performance measurement without existing mark');
            return;
        }
        console.log('[perf] measure', name);
        window.performance.measure(name, ROUTING_MARK_NAME);
    }

    function perfReset() {
        if (!window.performance) {
            return;
        }
        console.log('[perf] clearing marks');
        window.performance.clearMarks(ROUTING_MARK_NAME);
    }

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
            isFunction(c.vuex.moduleName) ?
                c.vuex.moduleName({ $route: route }) :
                c.vuex.moduleName
        );

        // Before routing, register any dynamic Vuex modules for new components
        router.beforeResolve((to, from, next) => {
            try {
                const fetchDataArgs = { app, route: to, router, store, from };
                router.getMatchedComponents(to)
                    .filter(c => 'vuex' in c)
                    .filter(c => !shouldIgnoreRouteUpdate(c, fetchDataArgs))
                    .forEach((c) => {
                        if (window.performance.getEntriesByName('route').length > 0) {
                            window.performance.measure('beforeResolve', 'route');
                        }
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
            const fetchDataArgs = { app, route: to, router, store, from };
            const toModuleNames = router.getMatchedComponents(to)
                .filter(c => 'vuex' in c)
                .map(c => getModuleName(c, to));
            router.getMatchedComponents(from)
                .filter(c => 'vuex' in c)
                .filter(c => !shouldIgnoreRouteUpdate(c, fetchDataArgs))
                .forEach((c) => {
                    perfMeasure('aftereach');
                    const fromModuleName = getModuleName(c, from);

                    // After every routing operation, perform available cleanup
                    // of registered modules, keeping around up to a specified
                    // maximum
                    const minIndex = Math.max(moduleIndex - opts.maxVuexModules, 0);
                    registeredModules.forEach((m, idx) => {
                        if (m.index < minIndex) {
                            if (!toModuleNames.includes(m.name) && m.name !== fromModuleName) {
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
        router.beforeEach((to, from, next) => {
            const fetchDataArgs = { app, route: to, router, store, from };
            const components = router.getMatchedComponents(to)
                .filter(c => !shouldIgnoreRouteUpdate(c, fetchDataArgs));

            // Only measure performance for non-ignored route changed
            if (components.length > 0) {
                perfInit();
            }

            next();
            return null;
        });

        // Prior to resolving a route, execute any component fetchData methods.
        // Approach based on:
        //   https://ssr.vuejs.org/en/data.html#client-data-fetching
        router.beforeResolve((to, from, next) => {
            const routeUpdateStr = `${from.fullPath} -> ${to.fullPath}`;
            const fetchDataArgs = { app, route: to, router, store, from };
            // Call fetchData for any routes that define it, otherwise resolve with
            // null to allow routing via next(null)
            const fetchData = c => (isFunction(c.fetchData) ? c.fetchData(fetchDataArgs) : null);
            const components = router.getMatchedComponents(to)
                .filter(c => !shouldIgnoreRouteUpdate(c, fetchDataArgs));

            // Short circuit if none of our components need to process the route update
            if (components.length === 0) {
                opts.logger.debug(`Ignoring route update ${routeUpdateStr}`);
                return next();
            }

            opts.logger.debug(`Running middleware/fetchData for route update ${routeUpdateStr}`);
            return Promise.resolve()
                .then(() => perfMeasure('beforeresolve'))
                .then(() => opts.middleware(to, from, store, app))
                .then(() => perfMeasure('after-middleware'))
                .then(() => Promise.all(components.map(fetchData)))
                // Proxy results through the chain
                .then((results) => {
                    perfMeasure('after-fetchdata');
                    return opts.postMiddleware(to, from, store, app).then(() => {
                        perfMeasure('after-post-middleware');
                        // Call next with the first non-null resolved value from fetchData
                        next(results.find(r => r != null));
                    });
                })
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
