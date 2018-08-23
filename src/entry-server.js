// Server side data loading approach based on:
// https://ssr.vuejs.org/en/data.html#client-data-fetching

export default function initializeServer(createApp, serverOpts) {
    const opts = Object.assign({
        vuexModules: true,
        logger: console,
        preMiddleware: () => Promise.resolve(),
        middleware: () => Promise.resolve(),
        postMiddleware: () => Promise.resolve(),
    }, serverOpts);

    return context => new Promise((resolve, reject) => {
        opts.preMiddleware(context).then(() => {
            // Initialize our app with proper request and translations
            const { app, router, store } = createApp(context);

            router.push(context.url);
            router.onReady(() => {
                const components = router.getMatchedComponents();

                if (!components.length) {
                    opts.logger.warn(`No matched components for route: ${context.request.url}`);
                    return reject({ code: 404, message: 'Not Found' });
                }

                if (opts.vuexModules) {
                    // Register any dynamic Vuex modules.  Registering the store
                    // modules as part of the component allows the module to be bundled
                    // with the async-loaded component and not in the initial root store
                    // bundle
                    components
                        .filter(c => 'vuex' in c)
                        .forEach((c) => {
                            opts.logger.info('Registering dynamic Vuex module:', c.vuex.moduleName);
                            store.registerModule(c.vuex.moduleName, c.vuex.module, {
                                preserveState: store.state[c.vuex.moduleName] != null,
                            });
                        });
                }

                const fetchData = c => c.fetchData && c.fetchData({
                    app,
                    route: router.currentRoute,
                    router,
                    store,
                });

                // Execute all provided middleware prior to fetchData
                return opts.middleware(context, app, router, store)
                    .then(() => Promise.all(components.map(fetchData)))
                    .then(() => opts.postMiddleware(context, app, router, store))
                    // Set initialState and translations to be embedded into
                    // the template for client hydration
                    .then(() => Object.assign(context, {
                        initialState: JSON.stringify(store.state),
                    }))
                    .then(() => resolve(app))
                    .catch(e => reject(e));
            }, (e) => {
                opts.logger.error('Router rejected onReacy callback');
                return reject(e);
            });
        });
    });
}
