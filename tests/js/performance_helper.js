'use strict';

require('/tests/js/integration_helper.js');

(function(global) {

  var PerformanceHelper = {
    // Time before gecko spawns a new template process
    // see the pref dom.ipc.processPrelaunch.delayMs in
    // http://mxr.mozilla.org/mozilla-central/source/b2g/app/b2g.js#577
    // FIXME it would be very nice to get it automatically via marionette
    // we add 1s to this value to give a little more time to the background task
    // to finish the preloading
    kSpawnInterval: 6000,
    kRuns: 5,

    registerLoadTimeListener: function(device) {
      var registerListener =
        'var w = global.wrappedJSObject;' +
        'w.loadTimes = [];' +
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

    average: function(arr) {
      var sum = arr.reduce(function(i, j) {
        return i + j;
      });

      return sum / arr.length;
    },

    reportDuration: function(values, title) {
      title = title || '';
      if (global.mozPerfDurations === null) {
        global.mozPerfDurations = Object.create(null);
      }

      if (title in global.mozPerfDurations) {
        throw new Error('reportDuration was called twice with the same title');
      }
      var value = this.average(values);
      global.mozPerfDurations[title] = value;
    }
  };

  global.PerformanceHelper = PerformanceHelper;
}(this));
