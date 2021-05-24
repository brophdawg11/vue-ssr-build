// Allow a function to be passed that can generate a route-aware module name
export function getModuleName(vuexModuleDef, route) {
    const name = typeof vuexModuleDef.moduleName === 'function' ?
        vuexModuleDef.moduleName({ $route: route }) :
        vuexModuleDef.moduleName;
    return name;
}

// Return the namespaced module state
function getModuleState(store, nameArr) {
    return nameArr.reduce((acc, k) => (acc ? acc[k] : null), store.state);
}

export function safelyRegisterModule(store, name, vuexModule, logger) {
    const nameArr = name.split('/');
    if (store.hasModule(nameArr)) {
        logger.info(`Skipping duplicate dynamic Vuex module registration: ${name}`);
    } else {
        logger.info(`Registering dynamic Vuex module: ${name}`);
        store.registerModule(nameArr, vuexModule, {
            preserveState: getModuleState(store, nameArr) != null,
        });
    }
}
