var Phase = require('./phase');
var util = require('util');
var path = require('path');
var Promise = require('promise');
var performanceParser = require('../parsers/performance');
var memoryParser = require('../parsers/memory');
var debug = require('debug')('raptor:coldlaunch');
var homescreenConfig = require('../../dist/homescreens.json');

// These are derived from GAIA/shared/elements/gaia_grid/js/grid_layout.js
var GAIA_MIN_ICONS_PER_ROW = 3;
var GAIA_MIN_ROW_HEIGHT_FACTOR = 3.8;
var GAIA_MAX_ROW_HEIGHT_FACTOR = 5;
var GAIA_MIN_ICON_DISTANCE = 36;
var GAIA_MAX_ICON_DISTANCE = 38;
var VERTICAL_CONTEXT = 'verticalhome.gaiamobile.org';
var SYSTEM_CONTEXT = 'system.gaiamobile.org';

/**
 * Create a suite runner which achieves a ready state when an application is
 * cold-launched, e.g. from a new process
 * @param {{
 *   appPath: String,
 *   runs: Number,
 *   timeout: Number,
 *   retries: Number
 * }} options
 * @constructor
 */
var ColdLaunch = function(options) {
  Phase.call(this, options);

  this.title = 'Cold Launch';
  var runner = this;

  /**
   * To prepare for a test run we need to:
   * 1. Clear the ADB log
   * 2. Restart B2G
   * 3. Pre-fetch the application's coordinates
   * 4. Wait for the Homescreen to load so we know when to be able to launch
   * 5. Reset kernel cached values so following input events won't be ignored
   */

  this.getDevice()
    .then(function() {
      runner.setApplicationMetadata(options.appPath);
      runner.registerParser(performanceParser);
      runner.registerParser(memoryParser);
      runner.capture('performanceentry');
      runner.capture('memoryentry');
    })
    .then(function() {
      return runner.device.log.clear();
    })
    .then(function() {
      return runner.device.util.restartB2G();
    })
    .then(function() {
      return runner.setCoordinates();
    })
    .then(function() {
      return runner.waitForHomescreen();
    })
    .then(function() {
      return runner.prime();
    })
    .then(function() {
      runner.start();
    });
};

util.inherits(ColdLaunch, Phase);

/**
 * Set the coordinates of the Homescreen location for the application to launch.
 * This will translate the coordinates to device pixels.
 */
ColdLaunch.prototype.setCoordinates = function() {
  var manifestPath = this.manifestPath;
  var entryPoint = this.entryPoint;
  var appIndex = this.appIndex;

  var columns = homescreenConfig.preferences['grid.cols'];

  // The dimensions we receive from device.config are already the result
  // of an applied device pixel ratio. Therefore any calculations involving this
  // deviceWidth SHOULD NOT also use devicePixelRatio.
  var deviceWidth = this.device.config.dimensions[0];
  var devicePixelRatio = this.device.pixelRatio;

  var gridOrigin = this.GRID_ORIGIN_Y * devicePixelRatio;
  var columnWidth = deviceWidth / columns;
  var iconDistance = (columns === GAIA_MIN_ICONS_PER_ROW ?
    GAIA_MIN_ICON_DISTANCE : GAIA_MAX_ICON_DISTANCE) * devicePixelRatio;
  var rowHeightFactor = columns === GAIA_MIN_ICONS_PER_ROW ?
    GAIA_MIN_ROW_HEIGHT_FACTOR : GAIA_MAX_ROW_HEIGHT_FACTOR;
  var rowHeight = deviceWidth / rowHeightFactor;
  var ordinalX = columnWidth / 2;
  var ordinalY = gridOrigin + rowHeight / 2;
  var row = Math.floor(appIndex / columns);
  var column = appIndex % columns;

  this.appX = ordinalX + columnWidth * column;
  this.appY = ordinalY + (iconDistance + rowHeight) * row;
};

/**
 * Trigger the launch of an application by tapping at its coordinates on the
 * Homescreen.
 * @returns {Promise}
 */
ColdLaunch.prototype.launch = function() {
  var runner = this;

  return this.device.input.tap(this.appX, this.appY, 1)
    .then(function(time) {
      return runner.device.log.mark('tapAppIcon', time);
    });
};

/**
 * Resolve when the Homescreen has been fully loaded
 * @returns {Promise}
 */
ColdLaunch.prototype.waitForHomescreen = function() {
  var runner = this;

  return new Promise(function(resolve) {
    debug('Waiting for homescreen');

    runner.dispatcher.on('performanceentry', function listener(entry) {
      debug('Received performance entry `%s` in %s', entry.name, entry.context);

      if (entry.context !== VERTICAL_CONTEXT || entry.name !== 'fullyLoaded') {
        return;
      }

      if (!runner.homescreenPid) {
        debug('Capturing Homescreen PID: %d', entry.pid);
        runner.homescreenPid = entry.pid;
      }

      runner.dispatcher.removeListener('performanceentry', listener);
      resolve();
    });
  });
};

/**
 * From a given <appPath> generate any necessary manifest metadata, e.g.
 * entry point, application name, and other manifest data
 * @param appPath
 */
ColdLaunch.prototype.setApplicationMetadata = function(appPath) {
  var parts = appPath.split('/');

  this.manifestPath = parts[0];
  this.entryPoint = parts[1] || '';
  this.appIndex = null;
  this.appGaiaPath = null;
  var runner = this;

  // Walk through the config apps until we find one matching the current app
  homescreenConfig.homescreens[0]
    .every(function(app, index) {
      if (runner.manifestPath === app[1]) {
        if (runner.entryPoint) {
          if (runner.entryPoint === app[2]) {
            runner.appIndex = index;
            runner.appGaiaPath = app[0];
            return false;
          }
        } else {
          runner.appIndex = index;
          runner.appGaiaPath = app[0];
          return false;
        }
      }
      return true;
    });

  if (runner.appIndex === null) {
    return this.emit('error',
      new Error('Unable to find specified application on Homescreen'));
  }

  this.manifestURL = this.manifestPath + '.gaiamobile.org';
  this.manifest = this.requireManifest(path.join(
    process.cwd(), this.appGaiaPath, this.manifestPath, 'manifest.webapp'));
  this.appName = this.entryPoint ?
    this.manifest.entry_points[this.entryPoint].name :
    this.manifest.name;
  this.title = 'Cold Launch: ' + this.appName;
};

/**
 * Resolve when the launched application has created a performance marker
 * denoting `fullyLoaded`
 * @returns {Promise}
 */
ColdLaunch.prototype.waitForFullyLoaded = function() {
  var runner = this;
  var dispatcher = this.dispatcher;

  return new Promise(function(resolve) {
    dispatcher.on('performanceentry', function handler(entry) {
      debug('Received performance entry `%s` in %s', entry.name, entry.context);

      // Ignore performance entries that don't match the app we are testing
      if (entry.context !== runner.manifestURL) {
        return;
      }

      entry.appName = runner.appName;

      if (!runner.appPid && entry.pid !== runner.homescreenPid) {
        debug('Capturing application PID: %d', entry.pid);
        runner.appPid = entry.pid;
      }

      if (entry.name !== 'fullyLoaded') {
        return;
      }

      dispatcher.removeListener('performanceentry', handler);
      resolve(entry);
    });
  });
};

/**
 * Resolve when all memory entries are received for the launched application
 * @returns {Promise}
 */
ColdLaunch.prototype.waitForMemory = function() {
  var runner = this;
  var dispatcher = this.dispatcher;
  var hasUss = false;
  var hasPss = false;
  var hasRss = false;

  return new Promise(function(resolve) {
    dispatcher.on('memoryentry', function listener(entry) {
      debug('Received %s memory entry: %dMB',
        entry.name.toUpperCase(), entry.value / 1024 / 1024);

      if (entry.context !== runner.manifestURL) {
        return;
      }

      entry.appName = runner.appName;

      if (entry.name === 'uss') {
        hasUss = true;
      } else if (entry.name === 'pss') {
        hasPss = true;
      } else if (entry.name === 'rss') {
        hasRss = true;
      }

      if (hasUss && hasPss && hasRss) {
        dispatcher.removeListener('memoryentry', listener);
        resolve();
      }
    });
  });
};

/**
 * Prime application for cold-launch by starting the application and closing it,
 * causing it to do any introductory operations e.g. DB, IO, etc.
 * @returns {Promise}
 */
ColdLaunch.prototype.prime = function() {
  var runner = this;

  this.log('Priming application');

  // Delay launch to give time for pre-allocated process and system cool-down
  setTimeout(function() {
    return runner
      .resetInput()
      .then(function() {
        runner.launch();
      });
  }, this.options.launchDelay);

  return this
    .waitForFullyLoaded()
    .then(function() {
      return runner.closeApp();
    });
};

/**
 * Stand up an application cold launch for each individual test run. Will denote
 * the run has completed its work when the application is fully loaded and its
 * memory captured
 * @returns {Promise}
 */
ColdLaunch.prototype.testRun = function() {
  var runner = this;

  this
    .waitForFullyLoaded()
    .then(function(entry) {
      setTimeout(function() {
        runner.device.log.memory(runner.appPid, entry.context);
      }, runner.options.memoryDelay);
    });

  // Delay launch to give time for pre-allocated process and system cool-down
  setTimeout(function() {
    runner.launch();
  }, this.options.launchDelay);

  return this.waitForMemory();
};

/**
 * Close the currently launched application if one is opened
 * @returns {Promise}
 */
ColdLaunch.prototype.closeApp = function() {
  if (!this.appPid) {
    return Promise.resolve(null);
  }

  var runner = this;

  return this.device.util
    .kill(this.appPid)
    .then(function() {
      runner.appPid = null;
    });
};

/**
 * Retry handler which is invoked if a test run fails to complete. Do a input
 * reset to clear kernel cached values.
 * @returns {Promise}
 */
ColdLaunch.prototype.retry = function() {
  var runner = this;

  return this
    .closeApp()
    .then(function() {
      return runner.resetInput();
    });
};

/**
 * Report the results for an individual test run
 * @returns {Promise}
 */
ColdLaunch.prototype.handleRun = function() {
  var manifestURL = this.manifestURL;

  var results = this.format(this.results.filter(function(entry) {
    return entry.context === manifestURL || entry.context === SYSTEM_CONTEXT;
  }), 'coldlaunch', 'tapAppIcon');

  return this.report(results);
};

module.exports = ColdLaunch;
