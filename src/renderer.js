const fs = require('fs');
const path = require('path');
const LRU = require('lru-cache');
const { createBundleRenderer } = require('vue-server-renderer');

const errorHandler = (err, res, cb) => {
    if (err.url) {
        res.redirect(err.url);
    } else if (err.code === 404) {
        res.status(err.code).send('404 | Page Not Found');
    } else {
        // Render Error Page or Redirect
        res.status(500).send('500 | Internal Server Error');
        /* eslint-disable no-console */
        console.error(err);
        console.error(err.stack);
    }
    cb();
};

// Base config - extended via client argument to initVueRenderer
const config = {
    errorHandler,
    i18nDirective: false,
    isLocal: process.env.NODE_ENV === 'local',
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
    hmr: false,
    stream: true,
    componentCacheDebug: false,
    componentCacheMaxAge: 15 * 60 * 1000,
    componentCacheMaxSize: 1024 * 1024,
    rendererOpts: null,
    templatePath: null,
    clientConfig: null,
    serverConfig: null,
    clientManifest: null,
    serverBundle: null,
};

let cache;
let renderer;
let readyPromise;

function createRenderer(bundle, options) {
    /* eslint-disable global-require */
    const t = config.i18nDirective ?
        require('vue-i18n-extensions').directive :
        null;

    if (cache) {
        console.log(
            'Recreating the Vue SSR BundleRenderer, clearing the component cache',
            'and re-creating',
        );
        cache.reset();
        cache = null;
    }

    const prettySize = Math.round(config.componentCacheMaxSize / 1024);
    const prettyAge = Math.round(config.componentCacheMaxAge / 1000);
    console.log(`Creating component cache: maxSize ${prettySize}Kb, maxAge ${prettyAge}s`);
    cache = LRU({
        length(n, key) {
            // Vue components come in as an object with an html key containing
            // the SSR output
            const valid = (
                n != null &&
                n.html != null &&
                typeof n.html.length === 'number'
            );
            const length = valid ? n.html.length : 1;
            if (config.componentCacheDebug) {
                console.log(`Adding component cache entry: key=${key}, length=${length}`);
            }
            return length;
        },
        max: config.componentCacheMaxSize,
        maxAge: config.componentCacheMaxAge,
    });

    return createBundleRenderer(bundle, Object.assign(options, {
        cache,
        runInNewContext: false,
        // Only include the t directive when specified
        ...(t ? { directives: { t } } : {}),
    }, config.rendererOpts));
}

function renderToString(context, res, cb) {
    renderer.renderToString(context,
        (err, html) => {
            if (err) {
                config.errorHandler(err, res, cb);
            } else {
                res.send(html);
                cb();
            }
        },
        e => config.errorHandler(e, res, cb));
}

function renderToStream(context, res, cb) {
    const stream = renderer.renderToStream(context);
    stream.on('data', data => res.write(data.toString()));
    stream.on('end', () => {
        res.end();
        cb();
    });
    stream.on('error', err => config.errorHandler(err, res, cb));
}

function render(clientManifest, req, res) {
    const s = Date.now();

    console.log('\n\nVue request started', new Date().toISOString());

    const context = {
        title: 'URBN Community',
        request: req,
        response: res,
        url: req.url,
        clientManifest,
        initialState: null,
    };

    res.setHeader('Content-Type', 'text/html');

    // Render the appropriate Vue components into the renderer template
    // using the server render logic in entry-server.js
    const renderFn = config.stream ? renderToStream : renderToString;
    renderFn(context, res, () => {
        if (config.componentCacheDebug) {
            console.log('Component cache stats:');
            console.log('  length:', cache.length);
            console.log('  keys:', cache.keys().join(','));
        }
        console.log('Vue request ended', new Date().toISOString());
        console.log(`SSR request took: ${Date.now() - s}ms`);
    });
}

module.exports = function initVueRenderer(app, configOpts) {
    /* eslint-disable global-require, import/no-unresolved, import/no-dynamic-require */
    Object.assign(config, configOpts);

    // In development: setup the dev server with watch and hot-reload,
    // and create a new renderer on bundle / index template update.
    if (config.hmr) {
        readyPromise = require('./setup-dev-server')(
            app,
            config,
            (bundle, options) => { renderer = createRenderer(bundle, options); },
        );
        return (req, res) => {
            // Make dev server wait on webpack builds
            readyPromise.then(({ clientManifest }) => render(clientManifest, req, res));
        };
    }

    // Non-local mode without HMR
    const template = fs.readFileSync(config.templatePath, 'utf-8');
    const bundle = require(path.resolve(config.serverBundle));
    const clientManifest = require(path.resolve(config.clientManifest));

    renderer = createRenderer(bundle, { template, clientManifest });
    return function renderVueRoute(req, res) {
        return render(clientManifest, req, res);
    };
};
