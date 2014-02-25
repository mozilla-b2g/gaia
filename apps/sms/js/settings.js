/*
  Message app settings related value and utilities.
*/
/* global
    Promise
 */

/* exported Settings */


'use strict';

var Settings = {
  MMS_SERVICE_ID_KEY: 'ril.mms.defaultServiceId',
  _serviceIds: null,
  _readyListeners: null,
  _isReady: false,
  mmsSizeLimitation: 300 * 1024, // Default mms message size limitation is 300K.
  mmsServiceId: null, // Default mms service SIM ID (only for DSDS)
  get nonActivateMmsServiceIds() { // Non activate mms ID (only for DSDS)
    var serviceIds = this._serviceIds.slice();
    serviceIds.splice(this.mmsServiceId, 1);
    return serviceIds;
  },

  init: function settings_init() {
    return this.doInit()
      .then(this.onReady.bind(this))
      .catch(function(e) {
        // let's catch errors early
        console.error(e);
      });
  },

  doInit: function settings_doInit() {
    var keyHandlerSet = {
      'dom.mms.operatorSizeLimitation': Settings.initMmsSizeLimitation
    };
    var settings = navigator.mozSettings;
    var conns = navigator.mozMobileConnections;

    function setHandlerMap(key) {
      return new Promise(function settingResolver(resolve, reject) {
        var req = settings.createLock().get(key);
        req.onsuccess = function settings_getSizeSuccess() {
          var handler = keyHandlerSet[key];
          handler(req.result[key]);
          resolve();
        };
      });
    }

    this._isReady = false;
    this._serviceIds = [];

    if (!settings) {
      return Promise.resolve();
    }

    // Only DSDS will need to handle mmsServiceId
    if (conns && conns.length > 1) {
      keyHandlerSet[this.MMS_SERVICE_ID_KEY] = this.initMmsServiceId;
      // Cache all existing serviceIds
      for (var i = 0, l = conns.length; i < l; i++) {
        this._serviceIds.push(i);
      }
    }

    var promises = [];
    for (var key in keyHandlerSet) {
      promises.push(setHandlerMap(key));
    }

    return Promise.all(promises);
  },

  // Set MMS size limitation:
  // If operator does not specify MMS message size, we leave the decision to
  // MessageManager and return nothing if we can't get size limitation from db
  initMmsSizeLimitation: function initMmsSizeLimitation(size) {
    if (size && !isNaN(size)) {
      Settings.mmsSizeLimitation = size;
    }
  },

  // Set default mms service SIM ID and add observer:
  // In DSDS scenario, if we notify user to switch to subscription to retrieve
  // the MMS from non-active subscription, we'll need current mmsServiceId
  // information to tell user the active/non-active subscription
  initMmsServiceId: function initMmsServiceId(id) {
    if (id !== undefined) {
      Settings.mmsServiceId = id;
    }
    navigator.mozSettings.addObserver(Settings.MMS_SERVICE_ID_KEY, function(e) {
      Settings.mmsServiceId = e.settingValue;
    });
  },

  setSimServiceId: function setSimServiceId(id) {
    // mms & data are both necessary for connection switch.
    navigator.mozSettings.createLock().set({
      'ril.mms.defaultServiceId': id,
      'ril.data.defaultServiceId': id
    });
  },

  switchSimHandler: function switchSimHandler(targetId, callback) {
    var conn = window.navigator.mozMobileConnections[targetId];
    if (conn && conn.data.state !== 'registered') {
      // Listen to MobileConnections datachange to make sure we can start
      // to retrieve mms only when data.state is registered. But we can't
      // guarantee datachange event will work in other device.
      conn.addEventListener('datachange', function onDataChange() {
        if (conn.data.state === 'registered') {
          conn.removeEventListener('datachange', onDataChange);
          callback();
        }
      });

      this.setSimServiceId(targetId);
    }
  },

  isDoubleSim: function isDoubleSim() {
    return this._serviceIds && this._serviceIds.length > 1;
  },

  onReady: function onReady() {
    this._isReady = true;
    if (this._readyListeners) {
      this._readyListeners.forEach(function(func) {
        func();
      });
    }

    this._readyListeners = null;
  },

  whenReady: function whenReady() {
    if (this._isReady) {
      return Promise.resolve();
    }

    return new Promise(function whenReadyResolver(resolve, reject) {
      if (!this._readyListeners) {
        this._readyListeners = [];
      }

      this._readyListeners.push(resolve);
    }.bind(this));
  }
};
