'use strict';
let Device = require('./device');
let Session = require('./session');
let eventToPromise = require('event-to-promise');
let inherits = require('util').inherits;

/**
 * @constructor
 */
function DeviceSession(host, options) {
  Session.apply(this, arguments);
  this.device = new Device(host._deviceService.port);
  this.profile = options.profile;
}

inherits(DeviceSession, Session);

/**
 * @return {Promise<void>}
 *
 * 1. Push profile to device.
 * 2. Soft reboot device.
 * 3. Start buffering logs.
 */
DeviceSession.prototype.start = function() {
  let device = this.device;
  return device.init()
  .then(() => device.loadProfile(this.profile))
  .then(() => device.rebootB2G())
  .then(() => device.streamLogcat())
  .then(logcat => {
    return eventToPromise(logcat, 'data');
    logcat.pipe(this.host.log);
  });
};

/**
 * @return {Promise<void>}
 */
DeviceSession.prototype.destroy = function() {
  this._logcat.removeAllListeners('data');
  let device = this.device;
  device._logStream.close();
  return Promise.resolve();
};

/**
 * @return {Promise<Error>}
 */
DeviceSession.prototype.checkError = function() {
  let device = this.device;
  return device.listCrashes()
  .then(crashes => {
    return Promise.all(
      crashes.map(crashId => device.downloadCrash(crashId))
    );
  })
  .then(crashes => {
    let error = new Error(JSON.stringify(crashes));
    error.name = 'ProcessCrash';
    return error;
  });
};

module.exports = DeviceSession;
