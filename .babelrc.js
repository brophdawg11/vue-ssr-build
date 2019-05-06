module.exports = {
    "presets": [
        ["@babel/preset-env", {
            "targets": {
                "browsers": [ ">5%", "last 2 versions" ]
            },
            "modules": false
        }],
        "@babel/preset-stage-3"
    ],
    "plugins": [
        // Allow proper tree shaking of lodash ES6 named imports
        "lodash",
        "syntax-dynamic-import"
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
