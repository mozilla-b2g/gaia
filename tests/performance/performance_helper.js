'use strict';

var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');
var GetAppName = requireGaia('/tests/performance/getappname.js');
var MemInfo = requireGaia('/tests/performance/meminfo.js');

// Function to send results to the reporter that is OOP
// Basically writing to the mocha-json-proxy
var sendResults = require('mocha-json-proxy/reporter').write;

/* opts can have the following keys:
 * - spawnInterval (optional): defines how many seconds we must wait before
 *   launching an app. Default is 6000.
 * - runs (optional): defines how many runs we should do. Default is 5.
 */
function PerformanceHelper(opts) {
  // default values
  var options = this.opts = {
    // Time before gecko spawns a new template process
    // see the pref dom.ipc.processPrelaunch.delayMs in
    // http://mxr.mozilla.org/mozilla-central/source/b2g/app/b2g.js#577
    // FIXME it would be very nice to get it automatically via marionette
    // we add 1s to this value to give a little more time to the background
    // task to finish the preloading
    spawnInterval: config.spawnInterval,
    runs: config.runs
  };

  Object.keys(opts).forEach(function(key) {
    options[key] = opts[key];
  });

  if (! this.opts.app) {
    var errMsg = 'The "app" property must be configured.';
    throw new Error('PerformanceHelper: ' + errMsg);
  }

  this.app = this.opts.app;
  this.runs = this.opts.runs;

  this.results = Object.create(null);
}

PerformanceHelper.injectHelperAtom = function(client) {
  client.contentScript.inject(
    config.gaiaDir + '/tests/performance/performance_helper_atom.js');
};

// FIXME encapsulate this in a nice object like PerformanceHelperAtom
// https://bugzilla.mozilla.org/show_bug.cgi?id=844032
PerformanceHelper.registerLoadTimeListener = function(client) {
  var registerListener =
    'var w = global.wrappedJSObject;' +
    'w.loadTimes = [];' +
    'if (w.onapplicationloaded) {' +
    /* We've been here before, let's clean ! */
    '  w.removeEventListener("apploadtime", w.onapplicationloaded);' +
    '}' +
    'w.onapplicationloaded = function(e) {' +
    '  var data = e.detail;' +
    /* So that it is backward compatible with the older gaia. */
    '  data.src = data.src || e.target.src;' +
    '  w.loadTimes.push(data);' +
    '};' +
    'w.addEventListener("apploadtime", w.onapplicationloaded);';

  client.executeScript(registerListener);
};

PerformanceHelper.unregisterLoadTimeListener = function(client) {
  var removeListener =
    'var w = global.wrappedJSObject;' +
    'w.removeEventListener("apploadtime", w.onapplicationloaded);';

  client.executeScript(removeListener);
};

PerformanceHelper.registerTimestamp = function(client) {
  client
    .executeScript(function registerListener() {
      window.addEventListener('apploadtime', function loadtimeHandler(e) {
        window.removeEventListener('apploadtime', loadtimeHandler);
        window.wrappedJSObject.epochStart = e.detail.timestamp;
      });
    });
};

PerformanceHelper.getEpochStart = function(client) {
  client.switchToFrame();

  return client
    .executeScript(function() {
      return window.wrappedJSObject.epochStart;
    });
};

PerformanceHelper.getEpochEnd = function(client) {
  return client.executeScript(function() {
    return document.defaultView.wrappedJSObject.epochEnd;
  });
};

PerformanceHelper.getLoadTimes = function(client) {
  var getResults = 'return global.wrappedJSObject.loadTimes;';
  return client.executeScript(getResults);
};

PerformanceHelper.getGoalData = function(client) {
  if (config.goals
      && client.session && client.session.device) {
    return config.goals[client.session.device];
  }
  return null;
};

PerformanceHelper.reportDuration = function(values, title) {
  title = title || '';
  sendResults('mozPerfDuration', { title: title, values: values });
};

PerformanceHelper.reportMemory = function(values, title) {
  title = title || '';
  var mozPerfMemory = {};
  mozPerfMemory[title] = values;
  sendResults('mozPerfMemory', mozPerfMemory);
};

PerformanceHelper.reportGoal = function(goals) {
  sendResults('mozPerfGoal', goals);
};

PerformanceHelper.prototype = {
    // startValue is the name of the start event.
    // By default it is 'start'
    reportRunDurations: function(runResults, startValue, delta) {

      startValue = startValue || 'start';
      delta = delta || 0;

      var start = runResults[startValue] || 0;
      delete runResults[startValue];

      for (var name in runResults) {
        var value = runResults[name] - start + delta;
        // Sometime we start from an event that happen later.
        // Ignore the one that occur before - ie negative values.
        if (value >= 0) {
          this.results[name] = this.results[name] || [];
          this.results[name].push(value);
        }
      }

    },

    finish: function() {
      for (var name in this.results) {
        PerformanceHelper.reportDuration(this.results[name], name);
      }
    },

    /**
     * Repeat the task 'fn' with a delay.
     * Call 'callback' if exist.
     *
     *    perf.repeatWithDelay(function(app, next) {
     *      app.launch();
     *      app.close();
     *    });
     *
     */
    repeatWithDelay: function(fn, callback) {

      callback = callback || this.app.defaultCallback;

      var pending = this.runs;

      function nextTask(err) {
        if (err) {
          return callback(err);
        }

        if (!--pending) {
          callback();
        } else {
          trigger();
        }
      }

      var self = this;
      function trigger() {
        self.delay(function() {
          self.task(fn, nextTask);
        });
      }

      trigger();
    },

    /*
     * Run a task 'fn', and then chain on the 'next' task.
     */
    task: function(fn, next) {
      var app = this.app;
      next = next || app.defaultCallback;

      fn(app);
      next();
    },

    delay: function(givenCallback) {
      givenCallback = givenCallback || client.defaultCallback;
      var interval = this.opts.spawnInterval;

      MarionetteHelper.delay(this.app.client, interval, givenCallback);
    },

    waitForPerfEvent: function(callback) {
      this.app.waitForPerfEvents(this.opts.lastEvent, callback);
    },

    /*
     * Get the memory stats for the specified app
     * as well as the main b2g.
     * See bug 917717.
     */
  getMemoryUsage: function(app) {
    var appName = GetAppName(app);
    var meminfo = MemInfo.meminfo();
    var info = null;
    var system = null;
    meminfo.some(function(element) {
      if(element.NAME == appName) {
        info = element;
      } else if(element.NAME == 'b2g') {
        system = element;
      }
      return info && system;
    });

    if (!info) {
      return null;
    }

    return {
      app: {
        name: info.NAME,
        uss: parseFloat(info.USS),
        pss: parseFloat(info.PSS),
        rss: parseFloat(info.RSS),
        vsize: parseFloat(info.VSIZE)
      },
      system: {
        name: system.NAME,
        uss: parseFloat(system.USS),
        pss: parseFloat(system.PSS),
        rss: parseFloat(system.RSS),
        vsize: parseFloat(system.VSIZE)
      }
    };
  }
};

module.exports = PerformanceHelper;
