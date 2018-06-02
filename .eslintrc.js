// http://eslint.org/docs/user-guide/configuring

module.exports = {
    root: true,
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module'
    },
    env: {
        browser: true,
        jest: true,
    },
    extends: [
        'airbnb-base',
        'plugin:vue/recommended'
    ],
    plugins: [
        'vue',
    ],
    // Check if imports actually resolve
    settings: {
        'import/resolver': {
            webpack: {
                config: 'build/webpack.client.config.js'
            }
        }
    },
    rules: {
        // Require spaces in array brackets, unless it's an array of objects
        "array-bracket-spacing": ['error', 'always', { objectsInArrays: false } ],
        // Don't enforce parents around arrow functions with bodies
        "arrow-parens": 'off',
        // 4 space indent
        "indent": [ "error", 4 ],
        // Don't enforce newlines on function parens
        "function-paren-newline": 'off',
        // Max length 0f 80 characters in source code
        "max-len": ['error', { code: 100 }],
        // Don't allow console.*, force logger usage
        'no-console': 'error',
        // Allow unary + and -- operators
        "no-plusplus": 'off',
        // Don't enforce on-var for now
        "one-var": 'off',
        // Don't enforce a blank line or not at the beginning of a block
        "padded-blocks": 'off',
        // Don't enforce promises being rejected with Error objects
        "prefer-promise-reject-errors": 'off',

        // Require extensions on non-JS files.  Turned off for now because when
        // aliased imports are ignored below, this can't determine the proper
        // extension and therefore causes all aliases imports to error
        //'import/extensions': ['error', 'always', { js: 'never' }],
        'import/extensions': 'off',

        // doesn't seem to play nice with aliases
        // See: https://github.com/benmosher/eslint-plugin-import/issues/376
        "import/no-unresolved": ['error', {
            commonjs: true,
            ignore: [ '^@' ],
        }],

        // Use 4 space indents in templates
        "vue/html-indent": ['error', 4],
        // Allow max 2 attributes on a single line element, but once the
        // element is spread across multiple, require one attribute per line
        "vue/max-attributes-per-line": ['error', {
            "singleline": 2,
            "multiline": {
                "max": 1,
                "allowFirstLine": true
            }
        }]
    },
}
