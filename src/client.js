/* eslint-disable no-console */
import { includes, isString } from 'lodash-es';
import { fetchDataForComponents } from './utils';

export default function initializeClient(createApp, clientOpts) {
    const opts = Object.assign({
        appSelector: '#app',
        initialState: null,
        initialStateMetaTag: 'initial-state',
        fetchData: true,
        vuexModules: true,
    }, clientOpts);

    if (opts.initialState == null && isString(opts.initialStateMetaTag)) {
        try {
            const sel = `meta[name="${opts.initialStateMetaTag}"]`;
            const meta = document.querySelector(sel);
            opts.initialState = JSON.parse(meta.getAttribute('content'));
        } catch (e) {
            console.error('Error hydrating initial state/mounting app', e);
        }
    }

    const { app, router, store } = createApp({
        initialState: opts.initialState,
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
                .forEach(c => {
                    console.info('Registering dynamic Vuex module:', c.vuex.moduleName);
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
                .forEach(c => {
                    console.info('Unregistering dynamic Vuex module:', c.vuex.moduleName);
                    store.unregisterModule(c.vuex.moduleName);
                    registeredModules[c.vuex.moduleName] = false;
                });
        });
    }

    if (opts.fetchData) {
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
                return fetchDataForComponents(components, store, to)
                    .then(() => next())
                    .catch(e => {
                        console.error('Error fetching component data, preventing routing', e);
                        next(false);
                    });
            });
        });

        app.$mount(opts.appSelector);
    }

    if (opts.hmr && module.hot) {
        module.hot.accept();
    }

    return { app, router, store };
}

