# vue-ssr-build

This package attempts to provide a core set of functionality for Vue SSR apps, including a single point of update for as many related dependencies as possible.

## Overview

* [Base Functionality](#base-functionality-provided-by-this-package)
* [Supported Versions](#currently-supported-versions)
* [Why?](#why)
* [Goals](#goals)
* [Non-Goals](#non-goals)
* [Usage](./Usage.md)
* [Pre-Processor Usage](./Pre-Processor-Usage.md)



## Base functionality provided by this package

* 2 [Webpack builds](https://ssr.vuejs.org/guide/build-config.html#server-config) for Vue SSR
  * Client build
  * Server build
* Base [`entry-client.js`](https://ssr.vuejs.org/guide/structure.html#entry-client-js) logic
* Base [`entry-server.js`](https://ssr.vuejs.org/guide/structure.html#entry-server-js) logic
* Express middleware for rendering using the client manifest and server bundle
* Logic for including Webpack HMR for the client bundle and middleware

## Currently Supported Versions

* `eslint@6.8.0`
* `jest@24.9.0`
* `vue@2.6.12`
* `vue-loader@15.8.3`
* `vue-server-renderer@2.6.12`
* `webpack@4.41.5`


## Why?

At one point in time, I found myself maintaining 3 or 4 separate Vue SSR apps.  All of which had stemmed from the same basic approach documented in [Vue's Official SSR Guide](https://ssr.vuejs.org/).  However, the process of maintaining multiple separate apps was complicated for multiple reasons:

* When a new version of any Vue-related dependency was released, manual updates were required in each app:
  * This included production dependencies, such as `vue` or `vue-server-renderer`
  * But it also meant all development dependencies, such as `vue-loader`, `babel-loader`, `sass-loader`, etc.
* Beyond that, all of the apps were being linted and unit tested in the same ways, so whenever those underlying frameworks were updated, it again required duplicate updates across multiple apps:
  *  `eslint`, `jest`, `eslint-plugin-vue`, `jest-serializer-vue`, etc.
* Often, while working in a single app, a new approach would occur to me that would enhance the logic being used for the core Vue SSR approach within the app.  This change would then need to be ported to each of the other apps
  * Build adjustments (base, client, server, or middleware)
  * Adjustments to the `fetchData` approach
  * Dynamic vuex module support
  * Routing logic alterations

Needless to say, all of that was tedious, time consuming, and annoying.


## Goals

The primary goals of this library are:

* Provide a baseline webpack setup for a Vue SSR app
* Provide the baseline implementation of a Vue SSR app, limited to client/server entry points and base Vue SSR HTML rendering
  * This includes HMR support if desired by the client
* Provide customization points to extend both of the above areas as needed
* Provide a single set of compatible `devDependencies` packaged together such that the client app can just include `vue-ssr-build` as a `devDependency`
  * Note that `vue` and `vue-server-renderer` are `peerDependencies` so they will need to be included as `dependencies` appropriately


## Non-Goals

The following are currently non-goals of this repository:

* Provide any baseline components, layout, or themeing logic for your app.  You are expected the build the Component-based app in it's entirety, and provide a `createApp` function to `vue-ssr-build`
* Provide a server implementation.  You are expected to create youe own `express` server and use the renderer middleware provided by this repo.
* Providing any build execution scripts.  You will be required to setup all of your scripts/tasks to build and run your app
* Provide any CLI or scaffolding support for your app.  This will likely include a small `demo` folder which will show an example of how to use `vue-ssr-build`, but at the moment you will be required to copy or mimic those files in your app
