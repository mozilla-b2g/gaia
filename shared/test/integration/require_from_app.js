'use strict';

/* global module */

var appRoot = require('app-root-path');

// TODO Export this helper in its own npm package

var FromApp = {
  filePathFromApp: function(app, relativePath) {
    if (['dialer', 'contacts'].indexOf(app) !== -1) {
      app = 'communications/' + app;
    }

    return appRoot + '/apps/' + app + '/test/marionette/' + relativePath;
  },

  requireFromApp: function(app, resource) {
    return require(FromApp.filePathFromApp(app, resource));
  }
};

module.exports = FromApp;
