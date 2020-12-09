module.exports = (api) => {
    api.cache(true);
    return {
        presets: [
            ['@babel/preset-env', {
                targets: {
                    browsers: [
                        'Chrome >= 61',
                        'Safari >= 11',
                        'iOS >= 11',
                        'Firefox >= 60',
                        'Edge >= 16',
                    ],
                },
                modules: false,
            }],
        ],
        plugins: [
            // We need loose due to new specifications in v7 https://babeljs.io/docs/en/v7-migration
            ['@babel/plugin-proposal-object-rest-spread', { loose: true }],
            '@babel/plugin-syntax-dynamic-import',
        ],
        env: {
            production: {
                plugins: [
                    // Allow proper tree shaking of lodash ES6 named imports
                    // Only wire this up in production so it doesn't cause issues
                    // when running with Jest.  See:
                    //    https://github.com/istanbuljs/babel-plugin-istanbul/issues/116
                    'lodash',
                ],
            },
            test: {
                presets: [
                    ['@babel/preset-env', {
                        modules: 'commonjs',
                        targets: { node: 'current' },
                    }],
                ],
                plugins: [
                    'babel-plugin-dynamic-import-node',
                ],
            },
        },
    };
};
