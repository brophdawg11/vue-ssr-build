/* eslint-disable no-console */
const { fetchDataForComponents } = require('./utils');

// Server side data loading approach based on:
// https://ssr.vuejs.org/en/data.html#client-data-fetching

module.exports = function initServer(createApp, serverOpts) {
    const opts = Object.assign({
        fetchData: true,
        vuexModules: true,
    }, serverOpts);

    return (context) => new Promise((resolve, reject) => {
        const { app, router, store } = createApp({ request: context.req });

        function onReady() {
            const components = router.getMatchedComponents();

            if (!components.length) {
                console.warn(`No matched components for route: ${context.req.url}`);
                return reject({ code: 404, message: 'Not Found' });
            }

            if (opts.vuexModules) {
                // Register any dynamic Vuex modules.  Registering the store
                // modules as part of the component allows the module to be bundled
                // with the async-loaded component and not in the initial root store
                // bundle
                components
                    .filter(c => 'vuex' in c)
                    .forEach(c => {
                        console.info('Registering dynamic Vuex module:', c.vuex.moduleName);
                        store.registerModule(c.vuex.moduleName, c.vuex.module, {
                            preserveState: store.state[c.vuex.moduleName] != null,
                        });
                    });
            }

            const fetchDataPromise = opts.fetchData ?
                fetchDataForComponents(components, store, router.currentRoute) :
                Promise.resolve();

            return fetchDataPromise
                // Set initialState for client hydration
                .then(() => Object.assign(context, {
                    initialState: JSON.stringify(store.state),
                }))
                .then(() => resolve(app))
                .catch(e => {
                    console.error('Caught server-side error in fetchData', e);
                    return reject(e);
                });
        }

        router.push(context.url);
        router.onReady(onReady, reject);
    });
};
