/* eslint-disable no-console */
const VSR = require('vue-server-renderer');

// Render a given route using the Vue bundle renderer
export default function getRenderFunction(middlewareOpts) {
    const opts = Object.assign({
        title: 'Vue SSR Build App',
        clientManifest: null,
        indexTemplate: null,
        serverBundle: null,
        useStream: true,
    }, middlewareOpts);

    const renderer = VSR.createBundleRenderer(opts.serverBundle, {
        runInNewContext: false,
        template: opts.indexTemplate,
        clientManifest: opts.clientManifest,
    });

    function handleError(err, res) {
        if (err.code) {
            return res.status(err.code).send(err.message);
        }
        console.error(err);
        return res.status(500).end(`Internal Server Error: ${err}`);
    }

    function renderToString(context, res) {
        renderer.renderToString(context, (err, html) => {
            if (err) {
                return handleError(err, res);
            }
            return res.end(html);
        }, e => {
            console.error(e);
            return res.status(500).end(e);
        });
    }

    function renderToStream(context, res) {
        const stream = renderer.renderToStream(context);
        stream.on('data', data => res.write(data.toString()));
        stream.on('end', () => res.end());
        stream.on('error', err => handleError(err, res));
    }

    return (req, res) => {
        // Global context for Server side template
        const context = {
            title: opts.title,
            req,
            res,
            url: req.url,
            initialState: null,
        };

        // Render the appropriate Vue components into the renderer template
        // using the server render logic in entry-server.js
        return opts.useStream ?
            renderToStream(context, res) :
            renderToString(context, res);
    };
}
