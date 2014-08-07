var fs = require('fs'),
    util = require('util'),
    assert = require('assert'),
    perfUtils = require('./perf-utils');

/* This is a helper to for perftesting apps. */
function PerfTestApp(client, origin) {
  if (perfUtils.isBlacklisted(config.blacklists.global, origin)) {
    this.client = null;
    this.origin = null;
    this.skip = true;
    if (config.verbose) {
      console.log('"%s" is a blacklisted app, skipping tests.', origin);
    }
    return;
  }

  var arr = config.appPath.split('/');
  var manifestPath = arr[0];
  var entryPoint = arr[1];
  var origin = util.format('app://%s',
    manifestPath.indexOf('.') !== -1 ?
    manifestPath :
    manifestPath + '.gaiamobile.org');

  this.entryPoint = entryPoint;
  this.client = client;
  this.origin = origin;
  this.skip = false;
}

module.exports = PerfTestApp;

PerfTestApp.prototype = {

  selectors: {},

  /** the Webapp instance. */
  instance: null,

  defaultCallback: function() {
  },

  /**
   * Launches app, switches to frame, and waits for it to be loaded.
   */
  launch: function() {
    var self = this;
    this.client.apps.launch(this.origin, this.entryPoint, function(err, app) {
      if (app) {
        self.instance = app;
      }
    });
    this.client.apps.switchToApp(this.origin);
    this.client.helper.waitForElement('body');
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  /**
   * Finds a named selector.
   *
   * @param {String} name aliased css selector.
   * @return {String} css selector.
   */
  selector: function(name) {
    var selector;
    if (!(name in this.selectors)) {
      throw new Error('unknown element "' + name + '"');
    }

    return this.selectors[name];
  },

  /**
   * Find a named selector.
   * (see .selectors)
   *
   *
   *    var dayView = app.element('dayView');
   *
   *
   * @param {String} name selector alias.
   * @param {Function} [callback] uses driver by default.
   */
  element: function(name, callback) {
    this.client.findElement(this.selector(name), callback);
  },

  waitForPerfEvents: function(stopEventName, callback) {
    var client = this.client;
    var self = this;

    this.client.executeAsyncScript(
      'window.wrappedJSObject.mozPerfWaitForEvent("' + stopEventName +
        '", function() { marionetteScriptFinished(); });',
      function(error) {

        if (error) {
          callback(null, error);
          return;
        }

        var runResults = client.executeScript(
          'return window.wrappedJSObject.mozPerfGetMeasurements();'
        );

        client.executeScript(
          'window.wrappedJSObject.mozPerfUnregisterListener();'
        );

        if (callback) {
          callback(runResults);
        }
    });
  }
};
