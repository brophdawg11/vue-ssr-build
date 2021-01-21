import { get, find, isEqual, isFunction, isString } from 'lodash-es';

/**
 * Determine if we should run our middlewares and fetchData for a given routing
 * operation.  This is a component-level specification that has two formats:
 *
 * // Object-shorthand
 * shouldProcessrouteUpdate: {
 *     path: true,    // Process updates if route.path changes
 *     query: false,  // Do not process route.query changes
 *     hash: false,   // Do not process route.hash changes
 * }
 *
 * // Function long form
 * shouldProcessRouteUpdate(fetchDataArgs) {
 *     // View-specific complex logic here
 * }
 *
 * You can also provide global defaults for the object shorthand via the config
 * options in initializeClient.  If not passed, they will default to the above
 * (only process path changes)
 *
 * @param   {object} c             Vue component definition object for destination route
 * @param   {object} fetchDataArgs Context argument passed to fetchData
 * @param   {object} spruDefaults  Defaults from initializeClient
 * @returns {boolean}              True if we should process this route update through the
 *                                 fetchData/middleware pipeline
 */
function shouldProcessRouteUpdate(c, fetchDataArgs, spruDefaults) {
    const { from, route } = fetchDataArgs;

    // Always process route updates when going between routing table entries
    if (get(from, 'name') !== get(route, 'name')) {
        return true;
    }

    // If the component specifies a function, use it
    if (isFunction(c.shouldProcessRouteUpdate)) {
        return c.shouldProcessRouteUpdate(fetchDataArgs) === true;
    }

    // Otherwise, use the defaults and override with any component opts.  Shallow
    // clone here so we don't persist anything from route to route
    const { path, query, hash } = {
        ...spruDefaults,
        ...c.shouldProcessRouteUpdate,
    };

    return (
        (path === true && get(from, 'path') !== get(route, 'path')) ||
        (query === true && !isEqual(get(from, 'query'), get(route, 'query'))) ||
        (hash === true && get(from, 'hash') !== get(route, 'hash'))
    );
}

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

function perfMarkNameFromRoute(route) {
    let result;
    const routeName = get(route, 'name') || '';

    if (routeName.toLowerCase() === 'catch-all') {
        const slugParam = get(route, 'params.slug');

        if (slugParam && slugParam !== '') {
            result = `Category (${slugParam})`;
        } else {
            result = 'Category';
        }
    } else if (routeName !== '') {
        result = routeName;
    } else {
        const pageType = get(route, 'meta.pageType');
        result = pageType;
    }

    return result;
}

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
    window.performance.mark(
        `${PERF_PREFIX}|${perfMarkNameFromRoute(from)}->${perfMarkNameFromRoute(to)}|start`);
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
        // By default, only run fetchData middlewares on path changes
        shouldProcessRouteUpdateDefaults: {
            path: true,
            query: false,
            hash: false,
        },
        ...clientOpts,
    };

    // Store off for closure scope usage
    enablePerfMarks = opts.enablePerfMarks;

    const { shouldProcessRouteUpdateDefaults: spruDefaults } = opts;
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
                    .filter(c => shouldProcessRouteUpdate(c, fetchDataArgs, spruDefaults))
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
                            // This module may have been registered outside of the
                            // routing flow, so only register it with Vuex if needed -
                            // but add it to our tracking of registeredModules regardless
                            if (get(store, `_modulesNamespaceMap.${name}/`) == null) {
                                store.registerModule(name, c.vuex.module, {
                                    preserveState: store.state[name] != null,
                                });
                            }
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
                .filter(c => shouldProcessRouteUpdate(c, fetchDataArgs, spruDefaults))
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
                .filter(c => shouldProcessRouteUpdate(c, fetchDataArgs, spruDefaults));

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
                .filter(c => shouldProcessRouteUpdate(c, fetchDataArgs, spruDefaults));

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
                    opts.logger.warn('Error fetching component data, preventing routing', e);
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
