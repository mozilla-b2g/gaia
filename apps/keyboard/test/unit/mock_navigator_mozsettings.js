'use strict';

/* global MockEventTarget, MockDOMRequest */

(function(exports) {

/**
 *
 * This is a mock of navigator.mozSettings
 * See
 * https://mxr.mozilla.org/mozilla-central/source/dom/settings/SettingsManager.js
 * for the platform implementation.
 *
 * Please use sinon.spy or sinon.stub to wrap these functions to do your things.
 *
 * Require MockEventTarget and MockDOMRequest.
 *
 */
var MockNavigatorMozSettings = function() {
  this._callbacks = {};
};

MockNavigatorMozSettings.prototype = new MockEventTarget();

MockNavigatorMozSettings.prototype.onsettingchange = null;

// This function returns a mocked lock object.
// to spy/stub the methods of the returned lock before this method is called,
// stub this method and return your own lock with spy/stub methods.
MockNavigatorMozSettings.prototype.createLock = function() {
  var lock = new MockNavigatorMozSettingsLock();

  return lock;
};

MockNavigatorMozSettings.prototype.addObserver = function(key, callback) {
  if (!this._callbacks[key]) {
    this._callbacks[key] = [callback];
  } else {
    this._callbacks[key].push(callback);
  }
};

MockNavigatorMozSettings.prototype.removeObserver = function(key, callback) {
  if (this._callbacks[key]) {
    var index = this._callbacks[key].indexOf(callback);
    if (index !== -1) {
      this._callbacks[key].splice(index, 1);
    }
  }
};

MockNavigatorMozSettings.prototype.dispatchSettingChange = function(key, val) {
  var evt = {
    type: 'settingchange',
    settingName: key,
    settingValue: val
  };
  this.dispatchEvent(evt);

  if (this._callbacks && this._callbacks[key]) {
    this._callbacks[key].forEach(function(cb) {
      cb({ settingName: key, settingValue: val });
    }.bind(this));
  }
};

var MockNavigatorMozSettingsLock = function() {
  this.closed = false;
};

MockNavigatorMozSettingsLock.prototype.set = function(arg) {
  var req = new MockDOMRequest();

  return req;
};

MockNavigatorMozSettingsLock.prototype.get = function(arg) {
  var req = new MockDOMRequest();

  return req;
};

MockNavigatorMozSettingsLock.prototype.clear = function(arg) {
  var req = new MockDOMRequest();

  return req;
};

exports.MockNavigatorMozSettings = MockNavigatorMozSettings;
exports.MockNavigatorMozSettingsLock = MockNavigatorMozSettingsLock;

})(window);
