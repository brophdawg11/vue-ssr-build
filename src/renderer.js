const path = require('path');
const fs = require('fs');
const LRU = require('lru-cache');
const { createBundleRenderer } = require('vue-server-renderer');

const config = require('./config')();

const USE_STREAM = true;
const resolve = file => path.resolve(__dirname, file);
const templatePath = resolve('../index.tpl.html');
let renderer;
let readyPromise;

function createRenderer(bundle, options) {
    return createBundleRenderer(bundle, Object.assign(options, {
        cache: LRU({
            max: 1000,
            maxAge: 1000 * 60 * 15,
        }),
        runInNewContext: false,
    }));
}

const handleError = (err, res) => {
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
};

function renderToString(context, res) {
    renderer.renderToString(context,
        (err, html) => (err ? handleError(err, res) : res.end(html)),
        e => handleError(e, res));
}

function renderToStream(context, res) {
    const stream = renderer.renderToStream(context);
    stream.on('data', data => res.write(data.toString()));
    stream.on('end', () => res.end());
    stream.on('error', err => handleError(err, res));
}

function render(req, res) {
    const s = Date.now();

    const context = {
        title: 'URBN Community',
        req,
        res,
        url: req.url,
        initialState: null,
    };

    res.setHeader('Content-Type', 'text/html');

    // Render the appropriate Vue components into the renderer template
    // using the server render logic in entry-server.js
    if (USE_STREAM) {
        renderToStream(context, res);
    } else {
        renderToString(context, res);
    }

    if (!config.isProd) {
        console.log(`Request took: ${Date.now() - s}ms`);
    }
}

module.exports = function initVueRenderer(app, configOpts) {
    /* eslint-disable global-require, import/no-unresolved */
    Object.assign(config, configOpts);

    // In development: setup the dev server with watch and hot-reload,
    // and create a new renderer on bundle / index template update.
    if (config.isLocal) {
        readyPromise = require('./setup-dev-server')(
            app,
            templatePath,
            (bundle, options) => { renderer = createRenderer(bundle, options); },
        );
        return (req, res) => {
            // Make dev server wait on webpack builds
            readyPromise.then(() => render(req, res));
        };
    }

    // Non-local mode without HMR
    const template = fs.readFileSync(templatePath, 'utf-8');
    const bundle = require('../../dist/vue-ssr-server-bundle.json');
    const clientManifest = require('../../dist/vue-ssr-client-manifest.json');
    renderer = createRenderer(bundle, { template, clientManifest });
    return render;
    /* eslint-enable global-require, import/no-unresolved */
};