## Pre-Processor Usage

We make use of various preprocessors to add functionality. Most notably:

* [Babel Loader](https://github.com/babel/babel-loader) to transpile JavaScript files
* [PostCSS Loader](https://github.com/postcss/postcss-loader) for the plugins it offer:s
    * [Autoprefixer](https://github.com/postcss/autoprefixer) to add vendor prefixes to CSS rules
* [Sass Loader](https://github.com/webpack-contrib/sass-loader) to compile `.scss` files to CSS

### Enabling/Configuring CSS Autoprefixer

In order to use the CSS Autoprefixer, two steps are required:

* `CSS_AUTOPREFIXER_ENABLED=true` must be set as a build time environment variable or the `postcss-loader` will not be added to webpack
*  There must be a `postcss.config.js` file and a `.browserslistrc` file in the root of the project

##### `postcss.config.js`

```
module.exports = {
    plugins: [
        require('autoprefixer'),
    ],
};
```

If you need to customize the options being passed to the Autoprefixer, you'll need to override this file with the following:

```
module.exports = {
    plugins: [
        require('autoprefixer')({
            option: value,
        }),
    ],
};
```

See the supported [Autoprefixer Options](https://github.com/postcss/autoprefixer#options) for more information.

##### `.browserslistrc`

```
last 2 versions
ie >= 11
safari >= 8
ios_saf >= 8
```

See the [Browserslist Docs](https://github.com/ai/browserslist#queries) for queries, browser names, config format, and defaults.
