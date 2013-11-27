'use strict';

var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');

// XXX make that exportable from the mocha-proxy
// see https://github.com/mozilla-b2g/mocha-json-proxy/pull/4
function json_proxy_write(event, content) {
  var args = Array.prototype.slice.call(arguments);

  if (!process.env['MOCHA_PROXY_SEND_ONLY']) {
    process.stdout.write(JSON.stringify(args) + '\n');
    return;
  }

  process.send(['mocha-proxy', args]);
}


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
    runs: mozTestInfo.runs
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
    registerLoadTimeListener: function(client) {
      var registerListener =
        'var w = global.wrappedJSObject;' +
        'w.loadTimes = [];' +
        'if (w.onapplicationloaded) {' +
        /* We've been here before, let's clean ! */
        '  w.removeEventListener("apploadtime", w.onapplicationloaded);' +
        '}' +
        'w.onapplicationloaded = function(e) {' +
        '  var data = e.detail;' +
        '  data.src = e.target.src;' +
        '  w.loadTimes.push(data);' +
        '};' +
        'w.addEventListener("apploadtime", w.onapplicationloaded);';

      client.executeScript(registerListener);
    },

    unregisterLoadTimeListener: function(client) {
      var removeListener =
        'var w = global.wrappedJSObject;' +
        'w.removeEventListener("apploadtime", w.onapplicationloaded);';

      client.executeScript(removeListener);
    },

    getLoadTimes: function(client) {
      var getResults = 'return global.wrappedJSObject.loadTimes;';
      return client.executeScript(getResults);
    },

    reportDuration: function(values, title) {
      title = title || '';
      var mozPerfDurations = {};
      mozPerfDurations[title] = values;
      json_proxy_write('mozPerfDuration', mozPerfDurations);
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

    observe: function() {
      if (! this.opts.lastEvent) {
        var errMsg = 'the "lastEvent" property must be configured.';
        throw new Error('PerformanceHelper: ' + errMsg);
      }
      this.app.observePerfEvents(this.opts.lastEvent);
    },

    waitForPerfEvent: function(callback) {
      this.app.waitForPerfEvents(this.opts.lastEvent, callback);
    }
  };

module.exports = PerformanceHelper;


