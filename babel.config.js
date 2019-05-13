module.exports = (api) => {
    api.cache(true);
    return {
        presets: [
            ['@babel/preset-env', {
                targets: {
                    browsers: ['>5%', 'last 2 versions'],
                },
                modules: false,
            }],
        ],
        plugins: [
            // Allow proper tree shaking of lodash ES6 named imports
            'lodash',
            // We need loose due to new specifications in v7 https://babeljs.io/docs/en/v7-migration
            ['@babel/plugin-proposal-object-rest-spread', { loose: true }],
            '@babel/plugin-syntax-dynamic-import',
        ],
        env: {
            test: {
                presets: [
                    ['@babel/preset-env', {
                        modules: 'commonjs',
                    }],
                ],
            },
        },
    };
};
