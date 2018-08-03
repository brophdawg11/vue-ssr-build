// Server side data loading approach based on:
// https://ssr.vuejs.org/en/data.html#client-data-fetching

import { isFunction } from 'lodash-es';

export default function initializeServer(createApp, serverOpts) {
    const opts = Object.assign({
        i18nLoader: null,
        vuexModules: true,
        logger: console,
    }, serverOpts);

    return context => new Promise((resolve, reject) => {

        function loadTranslations(req, i18nLoader) {
            return isFunction(i18nLoader) ?
                i18nLoader(req) :
                Promise.resolve(null);
        }

        function initApp(translations) {
            // Initialize our app with proper request and translations
            const { app, router, store } = createApp({
                request: context.req,
                translations,
            });

            function onReady() {
                const components = router.getMatchedComponents();

                if (!components.length) {
                    opts.logger.warn(`No matched components for route: ${context.req.url}`);
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
                    store,
                    route: router.currentRoute,
                });
                return Promise.all(components.map(fetchData))
                    // Set initialState and translations to be embedded into
                    // the template for client hydration
                    .then(() => Object.assign(context, {
                        initialState: JSON.stringify(store.state),
                        translations: JSON.stringify(translations),
                    }))
                    .then(() => resolve(app))
                    .catch((e) => {
                        opts.logger.error('Caught server-side error in fetchData', e);
                        return reject(e);
                    });
            }

            router.push(context.url);
            router.onReady(onReady, reject);
        }

        // Load any required translations and then initialize the vua app
        Promise.resolve()
            .then(() => loadTranslations(context.req, opts.i18nLoader))
            .then(translations => initApp(translations));
    });
}
