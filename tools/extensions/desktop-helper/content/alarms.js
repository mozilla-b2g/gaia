/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;
let Cm = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

function debug(str) {
  //dump('AlarmHalService: ' + str + '\n');
}

// -----------------------------------------------------------------------
// AlarmHalService
// -----------------------------------------------------------------------

function AlarmHalService() {
  debug('Constructor');
}

AlarmHalService.prototype = {
  _timer: Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer),
  setAlarm: function setAlarm(seconds, nanoseconds) {
    debug('setAlarm: ' + seconds);
    this._currentAlarm = seconds;

    this._timer.cancel();
    this._timer.initWithCallback(this, 1000, Ci.nsITimer.TYPE_REPEATING_SLACK);
    return true;
  },

  notify: function notify() {
    debug('notify: ' + (Date.now() / 1000) + ' < ' + this._currentAlarm + '\n');
    if ((Date.now() / 1000) < this._currentAlarm)
      return;

    debug('fired!!!');
    // Let's stop the timer to make sure it does not fire again...
    this._timer.cancel();

    if (this._alarmFiredCb) {
      try {
        this._alarmFiredCb();
      } catch (e) {}
    }
  },

  _alarmFiredCb: null,
  setAlarmFiredCb: function setAlarmFiredCb(callback) {
    debug('setAlarmFiredCb!!!');
    this._alarmFiredCb = callback;
  },

  _timezoneChangeDb: null,
  setTimezoneChangedCb: function setTimezoneChangedCb(callback) {
    debug('setTzFiredCb!!!');
    this._timezoneChangedCb = callback;
  },

  classID: newClassID,

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIAlarmHalService, Ci.nsITimerCallback
  ])
};

// Unregister the embedded low level component for alarm and
// replace it with our own.
let contract = '@mozilla.org/alarmHalService;1';
var newClassID = Cc['@mozilla.org/uuid-generator;1']
                   .getService(Ci.nsIUUIDGenerator)
                   .generateUUID();

// Unregister the old factory.
let oldCid = Cm.contractIDToCID(contract);
let oldFactory = Cm.getClassObjectByContractID(contract, Ci.nsIFactory);
Cm.unregisterFactory(oldCid, oldFactory);

// Register a new one.
let instance = null;
let newFactory = {
  createInstance: function(outer, iid) {
    if (outer)
     throw Components.results.NS_ERROR_NO_AGGREGATION;
    if (instance === null)
      instance = new AlarmHalService();
    instance.QueryInterface(iid);
    return instance.QueryInterface(iid);
  },
  lockFactory: function(aLock) {
     throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIFactory])
};
Cm.registerFactory(newClassID, '', contract, newFactory);

// Then let's start the AlarmService!
Cu.import('resource://gre/modules/AlarmService.jsm');
