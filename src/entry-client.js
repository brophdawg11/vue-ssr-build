import { get, find, isFunction, isString } from 'lodash-es';

// We only ignore route updates between when routing between the same entries
// in the routing table (i.e., Catch-All->Catch-All or PDP->PDP).  Never ignore
// route updates between routing table entries.
const shouldIgnoreRouteUpdate = (c, args) => (
    get(args, 'from.name') === get(args, 'route.name') &&
    isFunction(c.shouldIgnoreRouteUpdate) &&
    c.shouldIgnoreRouteUpdate(args) === true
);

// To be toggled on via client options if desired
let enablePerfMarks = false;

const PERF_PREFIX = 'urbnperf';
const perfEnabled = () => (
    enablePerfMarks &&
    window.performance !== null &&
    isFunction(window.performance.getEntriesByType)
);

// Look up the current perf mark of the format urbnperf|*|start
const getCurrentPerfMark = () => window.performance.getEntriesByType('mark')
    .find(m => m.name.startsWith(PERF_PREFIX) && m.name.endsWith('start'));

function perfInit(to, from) {
    if (!perfEnabled()) {
        return;
    }

    // Always clear any prior measurements before starting a new one
    window.performance.getEntriesByType('mark')
        .filter(m => m.name.startsWith(PERF_PREFIX))
        .forEach(m => window.performance.clearMarks(m.name));

    window.performance.getEntriesByType('measure')
        .filter(m => m.name.startsWith(PERF_PREFIX))
        .forEach(m => window.performance.clearMeasures(m.name));

    // Start a new routing operation with a mark such as:
    //   urbnperf|Homepage->Catch-All|start
    window.performance.mark(`${PERF_PREFIX}|${from.name}->${to.name}|start`);
}

// Issue a performance.measure call for the given name using the most recent
// 'start' mark
export function perfMeasure(name) {
    if (!perfEnabled()) {
        return false;
    }

    const mark = getCurrentPerfMark();
    if (!mark) {
        // Can't measure if we don't have a starting mark to measure from
        return false;
    }

    // Add a measurement from the start mark with the current name.  Example:
    //     urbnperf|Homepage->Catch-All|done
    const [prefix, route] = mark.name.split('|');
    window.performance.measure(`${prefix}|${route}|${name}`, mark.name);

    // return true here to indicate that we logged the measurement, but do not
    // attempt to return the measure object itself because it is not returned
    // from window.performance.measure according to the spec.  Some browsers
    // seem to return it our of convenience, but specifically mobile safari does
    // not
    return true;
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
        globalFetchData: () => Promise.resolve(),
        postMiddleware: () => Promise.resolve(),
        logger: console,
        enablePerfMarks: false,
        ...clientOpts,
    };

    // Store off for closure scope usage
    enablePerfMarks = opts.enablePerfMarks;

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
                perfInit(to, from);
            }

            next();
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
                .then(() => perfMeasure('beforeResolve'))
                .then(() => opts.middleware(to, from, store, app))
                .then(() => perfMeasure('middleware-complete'))
                .then(() => Promise.all([
                    opts.globalFetchData(fetchDataArgs),
                    ...components.map(fetchData),
                ]))
                // Proxy results through the chain
                .then((results) => {
                    perfMeasure('fetchData-complete');
                    return opts.postMiddleware(to, from, store, app)
                        // Call next with the first non-null resolved value from fetchData
                        .then(() => next(results.find(r => r != null)));
                })
                .catch((e) => {
                    opts.logger.error('Error fetching component data, preventing routing', e);
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
