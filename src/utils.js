export function fetchDataForComponents(components, store, route) {
    // Execute all component methods in parallel
    return Promise.all(components.map(c => {
        if (c.fetchData) {
            return c.fetchData({ store, route });
        }
        return null;
    }));
}
