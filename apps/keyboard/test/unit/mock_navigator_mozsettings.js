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

  this.mCalls = [];
};

MockNavigatorMozSettingsLock.prototype.set = function(arg) {
  var req = new MockDOMRequest();
  this.mCalls.push({
    name: 'set',
    arguments: [].slice.call(arguments),
    req: req
  });

  return req;
};

MockNavigatorMozSettingsLock.prototype.get = function(arg) {
  var req = new MockDOMRequest();
  this.mCalls.push({
    name: 'get',
    arguments: [].slice.call(arguments),
    req: req
  });

  return req;
};

MockNavigatorMozSettingsLock.prototype.clear = function(arg) {
  var req = new MockDOMRequest();
  this.mCalls.push({
    name: 'clear',
    arguments: [].slice.call(arguments),
    req: req
  });

  return req;
};

exports.MockNavigatorMozSettings = MockNavigatorMozSettings;

})(window);
