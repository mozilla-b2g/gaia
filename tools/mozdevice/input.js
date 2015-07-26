var path = require('path');
var util = require('util');
var Promise = require('promise');
var Command = require('./command');
var config = require('./config.json');

// Cache whether the orangutan binary has been pushed to the device during
// current session
var installed = false;

/**
 * API for interacting with a device via touch mechanisms
 * @param {Device} device
 * @constructor
 */
var Input = function(device) {
  this.device = device;
  this.serial = device.serial;
  this.inputEvent = device.config.inputEvent;
  this.scriptTimeout = device.config.scriptWriteTimeout || 250;
};

/**
 * Push the orangutan binary to the device and set relevant permissions
 * @returns {Promise}
 */
Input.prototype.installBinary = function() {
  if (installed) {
    return Promise.resolve(null);
  }

  var apiLevel = this.device.properties['ro.build.version.sdk'];
  var binary = path.join(__dirname, apiLevel >= 16 ? 'orng.pie' : 'orng');
  var serial = this.serial;

  return this.device.util
    .push(binary, '/data/local/orng')
    .then(function() {
      return new Command()
        .env('ANDROID_SERIAL', serial)
        .adbShell('chmod 777 /data/local/orng')
        .exec();
    })
    .then(function() {
      installed = true;
    });
};

/**
 * Invoke the orangutan binary for a pre-determined event script
 * @returns {Promise}
 */
Input.prototype.trigger = function() {
  var shellCommand = util.format('shell /data/local/orng %s /data/local/tmp/orng-cmd',
    this.inputEvent);

  return this.device.util.executeWithDeviceTime(shellCommand);
};

/**
 * Create an orangutan script on the device which contains the command to invoke
 * @param {string} command
 * @returns {Promise}
 */
Input.prototype.generateInputScript = function(command) {
  var input = this;
  var serial = this.serial;
  var script = util.format('echo "%s" > /data/local/tmp/orng-cmd', command);

  return new Promise(function(resolve, reject) {
    new Command()
      .env('ANDROID_SERIAL', serial)
      .adbShell(script)
      .exec()
      .then(function () {
        setTimeout(resolve, input.scriptTimeout);
      }, reject);
  });
};

/**
 * Generate an interaction API based on event types specified in config.json
 */
Object
  .keys(config.events)
  .forEach(function(event) {
    /**
     * Trigger an event with specified coordinates and repetitions
     * @returns {Promise}
     */
    Input.prototype[event] = function() {
      var input = this;
      var args = [config.events[event]].concat([].slice.call(arguments));
      return this
        .generateInputScript(util.format.apply(util, args))
        .then(function() {
          return input.trigger();
        });
    };
  });

module.exports = Input;
