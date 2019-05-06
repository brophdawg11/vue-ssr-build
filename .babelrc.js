module.exports = {
    "presets": [
        ["@babel/preset-env", {
            "targets": {
                "browsers": [ ">5%", "last 2 versions" ]
            },
            "modules": false
        }],
    ],
    "plugins": [
        // Allow proper tree shaking of lodash ES6 named imports
        "lodash",
        // Previously stage-3 (stages are no longer used in babel 7)
        // See https://babeljs.io/blog/2018/07/27/removing-babels-stage-presets
        "@babel/plugin-proposal-json-strings",
        "@babel/plugin-proposal-object-rest-spread",
        "@babel/plugin-syntax-dynamic-import",
        "@babel/plugin-syntax-import-meta",
    ],
    "env": {
        "test": {
            "presets": [
                ["env", {
                    "modules": "commonjs"
                }]
            ]
        }
    }
}
