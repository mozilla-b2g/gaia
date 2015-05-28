var Command = require('./command');
var Logging = require('./logging');
var Input = require('./input');
var Util = require('./util');
var path = require('path');
var merge = require('deepmerge');
var config = require('./config.json');

if (process.env.MOZDEVICE_CONFIG) {
  config = merge(config,
    require(path.resolve(process.cwd(), process.env.MOZDEVICE_CONFIG)));
}

var devices = config.devices;

// Regular expression for extracting adb property output
var GETPROP_MATCHER = /^\[([\s\S]*?)]: \[([\s\S]*?)]\r?$/gm;

/**
 * API for interacting with devices and environments
 * @param {String} [serial]
 * @constructor
 */
var Device = function(serial) {
  this.serial = serial;
};

/**
 * Map of properties obtained from `getprop`
 * @type {Object}
 */
Device.prototype.properties = null;

/**
 * Fetch and set the device serial, verifying that the device is connected
 * @returns {Promise}
 */
Device.prototype.setSerialVerified = function() {
  var device = this;
  var serial = device.serial;

  device.serial = null;

  return new Command()
    .adb('devices')
    .exec()
    .then(function(output) {
      var lines = output.split('\n').slice(1, -2);

      if (!lines.length) {
        throw new Error('No devices found');
      }

      lines.some(function(line) {
        var parts = line.split('\t');
        var currentSerial = parts[0];
        var state = parts[1];

        if (!currentSerial.length) {
          throw new Error('Unable to determine serial of connected device');
        }

        if (!serial) {
          device.serial = currentSerial;
          device.state = state;
          return true;
        }

        if (currentSerial === serial) {
          device.serial = serial;
          device.state = state;
          return true;
        }

        return false;
      });

      if (!device.serial || device.state !== 'device') {
        throw new Error('Unable to connect to device');
      }
    });
};

/**
 * Capture the data from `getprop` and assign to Device#properties
 * @returns {Promise}
 */
Device.prototype.setProperties = function() {
  var device = this;
  this.properties = {};

  return new Command()
    .env('ANDROID_SERIAL', this.serial)
    .adbShell('getprop')
    .exec()
    .then(function(output) {
      var value = output.toString();
      var match;

      while (match = GETPROP_MATCHER.exec(value)) {
        device.properties[match[1]] = match[2];
      }
    });
};

/**
 *
 * @param string deviceType Device type, e.g. 'b2g', 'android'
 * @param string model Device model to pull configuration data for
 * @returns {object}
 */
Device.prototype.findConfiguration = function(deviceType, model) {
  var key;

  model = model.toUpperCase();

  Object
    .keys(devices[deviceType])
    .some(function(device) {
      var isMatch = device.toUpperCase() === model;

      if (isMatch) {
        key = device;
        return true;
      }

      return false;
    });

  return devices[deviceType][key];
};

/**
 * Set device-specific configuration data based on the model of the device
 */
Device.prototype.setConfiguration = function() {
  var model = this.properties['ro.product.model'];

  this.config = this.findConfiguration('b2g', model) ||
    this.findConfiguration('android', model);
};

/**
 * Instantiate a Device API:
 * 1. Verify and set the serial for the device
 * 2. Fetch the device properties and set common values
 * 3. Set up device APIs and prepare for input
 * 4. Pre-fetch the Gecko and Gaia revisions
 * @param {String} [serial]
 * @returns {Promise}
 */
Device.create = function(serial) {
  var device = new Device(serial);

  return device
    .setSerialVerified()
    .then(function() {
      return device.setProperties();
    })
    .then(function() {
      return device.setConfiguration();
    })
    .then(function() {
      device.pixelRatio = device.properties[device.config.densityProperty ||
        'ro.sf.lcd_density'] / 160;
      device.touchFrequency = device.config.touchFrequency || 10;
      device.log = new Logging(device);
      device.input = new Input(device);
      device.util = new Util(device);
    })
    .then(function() {
      return device.input.installBinary();
    })
    .then(function() {
      return device.util.getGaiaRevision();
    })
    .then(function(gaiaRevision) {
      device.gaiaRevision = gaiaRevision;
      return device.util.getGeckoRevision();
    })
    .then(function(geckoRevision) {
      device.geckoRevision = geckoRevision;
      return device;
    });
};

/**
 * Instantiate a MozDevice API
 * @param {String} [serial]
 * @param {Function} callback
 */
module.exports = function(serial, callback) {
  if (typeof serial === 'function') {
    callback = serial;
    serial = null;
  }

  Device
    .create(serial)
    .then(function(device) {
      process.on('exit', function() {
        // Failsafe to ensure that if the process is force-killed that any
        // logging process still around is not left hanging
        device.log.stop();
      });

      callback(null, device);
    }, callback);
};
