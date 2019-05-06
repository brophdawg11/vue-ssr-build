module.exports = (api) => {
    api.cache(true);

    const presets = [
        ['@babel/preset-env', {
            targets: {
                browsers: ['>5%', 'last 2 versions'],
            },
            modules: false,
        }],
    ];

    const plugins = [
        // Allow proper tree shaking of lodash ES6 named imports
        'lodash',
        // Previously stage-3 (stages are no longer used in babel 7)
        // See https://babeljs.io/blog/2018/07/27/removing-babels-stage-presets
        '@babel/plugin-proposal-json-strings',
        // We need loose due to new specifications in v7 https://babeljs.io/docs/en/v7-migration
        ['@babel/plugin-proposal-object-rest-spread', { loose: true }],
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-syntax-import-meta',
    ];

    const env = {
        test: {
            presets: [
                ['env', {
                    modules: 'commonjs',
                }],
            ],
        },
    };

    return {
        presets,
        plugins,
        env,
    };
};
