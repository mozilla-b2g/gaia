'use strict';

/* global module */

var appRoot = require('app-root-path');

// TODO Export this helper in its own npm package

function FromApp(app) {
  this.app = app;
  return this;
}

FromApp.prototype = {
  filePath: function(relativePath) {
    var app = this.app;

    if (['dialer', 'contacts'].indexOf(app) !== -1) {
      app = 'communications/' + app;
    }

    return appRoot + '/apps/' + app + '/test/marionette/' + relativePath;
  },

  require: function(resource) {
    return require(this.filePath(resource));
  }
};

module.exports = function(app) {
  return new FromApp(app);
};
