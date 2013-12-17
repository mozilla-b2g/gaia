/**
 * @fileoverview This file is included in every single test run from
 *               marionette-mocha. It acts as a place to expose logic
 *               needed to write the tests.
 */
var HostManager = require('./runtime/hostmanager').HostManager,
    marionette = require('./runtime/marionette').marionette;


var manager = marionette._manager = new HostManager();

// Expose a public api.
global.marionette = marionette;
global.marionette.client = manager.createHost.bind(manager);
global.marionette.plugin = manager.addPlugin.bind(manager);
