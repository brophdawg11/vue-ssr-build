## Usage

#### Setup your webpack client/server builds by extending the base builds

```javascript
// build/webpack.client.config.js
const { join } = require('path');
const merge = require('webpack-merge');
const getClientConfig = require('vue-ssr-build/build/webpack.client.config');

// Configuration options that can be passed to getClientConfig
const configOpts = {
    type: 'client',       // required (client|server)
    rootDir: null,        // required - root directory of the repo,
                          // used for aliases
    extractCss: false,    // Used to extract CSS files during production builds
    enablePostCss: false, // Enable postcss-loader
    postCssOpts: null,    // options for postcss-loader
    i18nBlocks: false,    // Boolean - include support for <i18n> blocks
                          // in components
    theme: null,          // Theme for vue-themed-style-loader
    sassLoaderData: null, // Data to pass to sass-loader
    babelLoader: true,    // Include babel-loader for transpilation
};

module.exports = merge(getClientConfig(configOpts), {
    // Additional customizations here
});
```

```javascript
// build/webpack.server.config.js
const { join } = require('path');
const merge = require('webpack-merge');
const getServerConfig = require('vue-ssr-build/build/webpack.server.config');

// Configuration options that can be passed to getServerConfig
const configOpts = {
    type: 'client',       // required (client|server)
    rootDir: null,        // required - root directory of the repo,
                          // used for aliases
    extractCss: false,    // Used to extract CSS files during production builds
    enablePostCss: false, // Enable postcss-loader
    postCssOpts: null,    // options for postcss-loader
    i18nBlocks: false,    // Boolean - include support for <i18n> blocks
                          // in components
    theme: null,          // Theme for vue-themed-style-loader
    sassLoaderData: null, // Data to pass to sass-loader
    babelLoader: false,   // Include babel-loader for transpilation
};

module.exports = merge(getServerConfig(configOpts), {
    // Additional customizations here
});
```

#### Create your entry-client file using the base functionality

```javascript
import initializeClient from 'vue-ssr-build/src/entry-client';
import createApp from './path/to/your/create/app';

initializeClient(createApp, {
    // The following are all available options and their default values:

    // selector for where to mount the app
    appSelector: '#app',
    // Include HMR support?
    hmr: true,
    // Any existing initial vuex state, otherwise
    initialState: null,
    // Name of the meta tag where state is stringified
    initialStateMetaTag: 'initial-state',
    // Wire up logic for route-level vuex modules?
    vuexModules: true,
    // Logger instance
    logger: console
});
```

#### Create your entry-server files using the base functionality

```javascript
import initializeServer from 'vue-ssr-build/src/entry-server';
import createApp from '@js/create-app';

export default initializeServer(createApp, {
    // The following are all available options and their default values:

    // Wire up logic for route-level vuex modules?
    vuexModules: true,
    // Provide a function which will return a promise of all initial
    // i18n translations to be included
    i18nLoader: null,
    // Logger instance
    logger: console
});
```

#### Wire up the renderer middleware into your express server

```javascript
const express = require('express');

const app = express();

const rootPath = path.join(__dirname, '../..');
app.use('*', vueRenderer(app, {
    // The following are all available options and their default values:
    // Local build
    isLocal: process.env.NODE_ENV === 'local',
    // Dev build
    isDev:  process.env.NODE_ENV === 'development',
    // Prod build
    isProd:  process.env.NODE_ENV === 'production',
    // Enable HMR?
    hmr: false,
    // Additional options to pass to createBundleRenderer
    rendererOpts: null,
    // The remaining must be specified as absolute paths:
    templatePath:   path.join(rootDir, 'src/index.tpl.html'),
    clientConfig:   path.join(rootDir, 'build/webpack.client.config.js'),
    serverConfig:   path.join(rootDir, 'build/webpack.server.config.js'),
    clientManifest: path.join(rootDir, 'dist/vue-ssr-client-manifest.json'),
    serverBundle:   path.join(rootDir, 'dist/vue-ssr-server-bundle.json'),
}));
```

#### Babel, ESLint, Jest Configurations

For ease of use, this repository also provides `.babelrc.js`, `.eslintrc.js` and `jest.config.js` files that should work with the default configurations.  Simply import them into your configs and extend as needed.

#### Folder structure

This repository assumes a default folder structure and sets up webpack aliases and jest resolvers accordingly.  This can be overrideen in your own configurations.

```
YourRepo/
  build/
    ## Webpack configs here
  dist/  (alias @dist)
    ## Webpack should write output here
  src/
    components/   (alias @components)
    js/           (alias @js)
    scss/         (alias @scss)
    server/       (alias @server)
    store/        (alias @store)
  static/         (alias @static)
    ## Static files (favicon.ico, etc.)
```
