'use strict';

require('/tests/js/integration_helper.js');

(function(global) {

  function extend(dest, obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        dest[key] = obj[key];
      }
    }
  }

  /* opts can have the following keys:
   * - spawnInterval (optional): defines how many seconds we must wait before
   *   launching an app. Default is 6000.
   * - runs (optional): defines how many runs we should do. Default is 5.
   */
  function PerformanceHelper(opts) {
    // default values
    this.opts = {
      // Time before gecko spawns a new template process
      // see the pref dom.ipc.processPrelaunch.delayMs in
      // http://mxr.mozilla.org/mozilla-central/source/b2g/app/b2g.js#577
      // FIXME it would be very nice to get it automatically via marionette
      // we add 1s to this value to give a little more time to the background
      // task to finish the preloading
      spawnInterval: 6000,
      runs: 5,
      eventTitles: {}
    };

    // overwrite values from the user
    extend(this.opts, opts);

    if (! this.opts.app) {
      var errMsg = 'The "app" property must be configured.';
      throw new Error('PerformanceHelper: ' + errMsg);
    }

    this.app = this.opts.app;
    this.runs = this.opts.runs;

    this.results = Object.create(null);
  }

  extend(PerformanceHelper, {
    // FIXME encapsulate this in a nice object like PerformanceHelperAtom
    // https://bugzilla.mozilla.org/show_bug.cgi?id=844032
    registerLoadTimeListener: function(device) {
      var registerListener =
        'var w = global.wrappedJSObject;' +
        'w.loadTimes = [];' +
        'if (w.onapplicationloaded) {' +
        /* We've been here before, let's clean ! */
        '  w.removeEventListener("apploadtime", w.onapplicationloaded);' +
        '}' +
        'w.onapplicationloaded = function(e) {' +
        '  w.loadTimes.push(e.detail.time);' +
        '};' +
        'w.addEventListener("apploadtime", w.onapplicationloaded);';

      device.executeScript(registerListener);
    },

    unregisterLoadTimeListener: function(device) {
      var removeListener =
        'var w = global.wrappedJSObject;' +
        'w.removeEventListener("apploadtime", w.onapplicationloaded);';

      device.executeScript(removeListener);
    },

    getLoadTimes: function(device) {
      var getResults = 'return global.wrappedJSObject.loadTimes;';
      return device.executeScript(getResults);
    },


    reportDuration: function(values, title) {
      title = title || '';

      // this is global because we need to access this in the Reporter
      if (global.mozPerfDurations === null) {
        global.mozPerfDurations = Object.create(null);
      }

      if (title in global.mozPerfDurations) {
        var errMsg = 'reportDuration was called twice with the same title';
        throw new Error('PerformanceHelper: ' + errMsg);
      }
      global.mozPerfDurations[title] = values;
    }
  });

  PerformanceHelper.prototype = {
    reportRunDurations: function(runResults) {

      var start = runResults.start || 0;
      delete runResults.start;

      for (var name in runResults) {
        this.results[name] = this.results[name] || [];
        this.results[name].push(runResults[name] - start);
      }

    },

    finish: function() {
      for (var name in this.results) {
        var title = this.opts.eventTitles[name] || name;
        PerformanceHelper.reportDuration(this.results[name], title);
      }
    },

    delay: function() {
      IntegrationHelper.delay(this.app.device, this.opts.spawnInterval);
    },

    observe: function() {
      if (! this.opts.lastEvent) {
        var errMsg = 'the "lastEvent" property msut be configured.';
        throw new Error('PerformanceHelper: ' + errMsg);
      }
      return this.app.observePerfEvents(this.opts.lastEvent);
    }
  };

  global.PerformanceHelper = PerformanceHelper;
})(window);
