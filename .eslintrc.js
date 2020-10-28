// http://eslint.org/docs/user-guide/configuring

module.exports = {
    root: true,
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module',
    },
    env: {
        browser: true,
        jest: true,
    },
    extends: [
        'airbnb-base',
        'plugin:vue/recommended',
    ],
    plugins: [
        'vue',
    ],
    rules: {
        // Kept from airbnb-base@13, that switched to 'always' in 14
        'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
        // 4 space indent
        indent: ['error', 4],
        // Don't enforce newlines on function parens
        'function-paren-newline': 'off',
        // Max length 0f 80 characters in source code
        'max-len': ['error', {
            code: 100,
            ignoreUrls: true,
        }],
        // Don't allow console.*, force logger usage
        'no-console': 'error',
        // Allow unary ++ and -- operators
        'no-plusplus': 'off',
        // Allow up to 8 props, but mostly rely on max line length to limit this
        'object-curly-newline': ['error', {
            ObjectExpression: { minProperties: 8, multiline: true, consistent: true },
            ObjectPattern: { minProperties: 8, multiline: true, consistent: true },
            ImportDeclaration: { minProperties: 8, multiline: true, consistent: true },
            ExportDeclaration: { minProperties: 8, multiline: true, consistent: true },
        }],
        // Put operators at the end of the line (?, :, &&, ||)
        'operator-linebreak': ['error', 'after'],
        // Don't enforce a blank line or not at the beginning of a block
        'padded-blocks': 'off',
        // Don't enforce promises being rejected with Error objects
        'prefer-promise-reject-errors': 'off',
        // Use 4 space indents in templates
        'vue/html-indent': ['error', 4],
        // Allow max 2 attributes on a single line element, but once the
        // element is spread across multiple, require one attribute per line
        'vue/max-attributes-per-line': ['error', {
            singleline: 3,
            multiline: {
                max: 1,
                allowFirstLine: true,
            },
        }],
    },
};
