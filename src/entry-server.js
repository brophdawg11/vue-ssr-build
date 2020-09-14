// Server side data loading approach based on:
// https://ssr.vuejs.org/en/data.html#client-data-fetching

export default function initializeServer(createApp, serverOpts) {
    const opts = {
        vuexModules: true,
        logger: console,
        preMiddleware: () => Promise.resolve(),
        middleware: () => Promise.resolve(),
        globalFetchData: () => Promise.resolve(),
        postMiddleware: () => Promise.resolve(),
        ...serverOpts,
    };

    return context => new Promise((resolve, reject) => Promise.resolve()
        .then(() => opts.preMiddleware(context))
        .then(() => {
            // Initialize our app with proper request and translations
            const { app, router, store } = createApp(context);

            router.push(context.url);
            router.onReady(() => {
                const components = router.getMatchedComponents();

                if (!components.length) {
                    return reject({
                        code: 404,
                        message: 'Not Found',
                        data: `No matched components for route: ${context.request.url}`,
                    });
                }

                if (opts.vuexModules) {
                    // Register any dynamic Vuex modules.  Registering the store
                    // modules as part of the component allows the module to be bundled
                    // with the async-loaded component and not in the initial root store
                    // bundle
                    components
                        .filter(c => 'vuex' in c)
                        .forEach((c) => {
                            // Allow a function to be passed that can generate a route-aware
                            // module name
                            const moduleName = typeof c.vuex.moduleName === 'function' ?
                                c.vuex.moduleName({ $route: router.currentRoute }) :
                                c.vuex.moduleName;
                            opts.logger.info('Registering dynamic Vuex module:', moduleName);
                            store.registerModule(moduleName, c.vuex.module, {
                                preserveState: store.state[moduleName] != null,
                            });
                        });
                }

                const fetchDataArgs = {
                    ssrContext: context,
                    app,
                    route: router.currentRoute,
                    router,
                    store,
                };
                const fetchData = c => c.fetchData && c.fetchData(fetchDataArgs);

                // Execute all provided middleware prior to fetchData
                return Promise.resolve()
                    .then(() => opts.middleware(context, app, router, store))
                    .then(() => Promise.all([
                        opts.globalFetchData(fetchDataArgs),
                        ...components.map(fetchData),
                    ]))
                    .then(() => opts.postMiddleware(context, app, router, store))
                    // Set initialState and translations to be embedded into
                    // the template for client hydration
                    .then(() => Object.assign(context, {
                        // Stringify so we can use JSON.parse for performance.
                        //   Double stringify to properly escape characters. See:
                        //   https://v8.dev/blog/cost-of-javascript-2019#json
                        initialState: JSON.stringify(JSON.stringify(
                            store.state,
                            // Custom JSON.stringify replacer function to do 2 things:
                            // * Convert any `_ssr_` prefixed keys to undefined values so
                            //   they get stripped.  These properties are strictly for SSR
                            //   memoization of non-reactive expensive getter methods
                            // * Convert all undefined values to null's during stringification.
                            //   Default behavior of JSON.stringify is to strip undefined values,
                            //   which breaks client side hydration because Vue won't make the
                            //   property reactive. See:
                            //     https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description
                            (k, v) => {
                                if (k.startsWith('_ssr_')) {
                                    return undefined;
                                }
                                if (v === undefined) {
                                    return null;
                                }
                                return v;
                            },
                        )),
                    }))
                    .then(() => resolve(app))
                    .catch((e) => {
                        opts.logger.log('Error in middleware chain', e);
                        return reject(e);
                    });
            }, (e) => {
                opts.logger.log('Router rejected onReady callback', e);
                return reject(e);
            });
        })
        .catch((e) => {
            opts.logger.log('Error in preMiddleware chain', e);
            return reject(e);
        }));
}
