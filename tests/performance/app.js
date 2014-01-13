var fs = require('fs'),
    util = require('util');

/* This is a helper to for perftesting apps. */
function PerfTestApp(client, origin) {
  if (excludedApps.indexOf(origin) !== -1) {
    this.client = null;
    this.origin = null;
    this.skip = true;
    if (process.env.VERBOSE) {
      console.log("'" + origin +
                  "' is an excluded app, skipping tests.");
    }
    return;
  }
  var arr = mozTestInfo.appPath.split('/');
  manifestPath = arr[0];
  entryPoint = arr[1];

  origin = util.format('app://%s.gaiamobile.org',
                       manifestPath);
  this.entryPoint = entryPoint;
  this.client = client;
  this.origin = origin;
  this.skip = false;
}

module.exports = PerfTestApp;

PerfTestApp.prototype = {

  selectors: {},

  PERFORMANCE_ATOM: 'window.wrappedJSObject.PerformanceHelperAtom',

  defaultCallback: function() {
  },

  /**
   * Launches app, switches to frame, and waits for it to be loaded.
   */
  launch: function() {
    this.client.apps.launch(this.origin, this.entryPoint);
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

  observePerfEvents: function(stopEventName) {

    this.client.executeScript(
      fs.readFileSync('./tests/performance/performance_helper_atom.js') + '\n'
    );

  },

  waitForPerfEvents: function(stopEventName, callback) {
    var client = this.client;
    var self = this;

    this.client.executeAsyncScript(
      this.PERFORMANCE_ATOM + '.waitForEvent("' + stopEventName +
        '", function() { marionetteScriptFinished(); });',
      function() {
        var runResults = client.executeScript(
          'return ' + self.PERFORMANCE_ATOM + '.getMeasurements();'
        );

        client.executeScript(
          self.PERFORMANCE_ATOM + '.unregister();'
        );

        if (callback) {
          callback(runResults);
        }
    });
  }
};
