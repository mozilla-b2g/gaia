/*
  Message app settings related value and utilities.
*/

/* exported Settings */


'use strict';

var Settings = {
  SERVICE_ID_KEYS: {
    mmsServiceId: 'ril.mms.defaultServiceId',
    smsServiceId: 'ril.sms.defaultServiceId'
  },

  READ_AHEAD_THREADS_KEY: 'ril.sms.maxReadAheadEntries',

  // we evaluate to 5KB the size overhead of wrapping a payload in a MMS
  MMS_SIZE_OVERHEAD: 5 * 1024,

  _serviceIds: null,

  // we need to remove this when email functionality is ready.
  supportEmailRecipient: true,

  // We set the default maximum concatenated number of our SMS app to 10
  // based on:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=813686#c0
  maxConcatenatedMessages: 10,
  mmsSizeLimitation: 295 * 1024, // Default mms message size limitation is 295K
  mmsServiceId: null, // Default mms service SIM ID
  smsServiceId: null, // Default sms service SIM ID

  init: function settings_init() {
    var keyHandlerSet = {
      'dom.mms.operatorSizeLimitation': this.initMmsSizeLimitation.bind(this),
      'operatorResource.sms.maxConcat':
        this.initSmsMaxConcatenatedMsg.bind(this)
    };
    var settings = navigator.mozSettings;
    var conns = navigator.mozMobileConnections;

    function setHandlerMap(key) {
      var req = settings.createLock().get(key);
      req.onsuccess = function settings_getSizeSuccess() {
        var handler = keyHandlerSet[key];
        handler(req.result[key]);
      };
    }

    this._serviceIds = [];

    if (!settings) {
      return;
    }

    // Only DSDS will need to handle mmsServiceId
    if (conns && conns.length > 1) {
      for (var prop in this.SERVICE_ID_KEYS) {
        var setting = this.SERVICE_ID_KEYS[prop];
        keyHandlerSet[setting] = this.initServiceId.bind(this, setting, prop);
      }

      // Cache all existing serviceIds
      for (var i = 0, l = conns.length; i < l; i++) {
        this._serviceIds.push(conns[i].iccId);
      }
    }

    for (var key in keyHandlerSet) {
      setHandlerMap(key);
    }
  },

  //Set Maximum concatenated number of our SMS
  initSmsMaxConcatenatedMsg: function initSmsMaxConcatenatedMsg(num) {
    if (num && !isNaN(num)) {
      this.maxConcatenatedMessages = num;
    }
  },

  // Set MMS size limitation:
  // If operator does not specify MMS message size, we leave the decision to
  // MessageManager and return nothing if we can't get size limitation from db
  initMmsSizeLimitation: function initMmsSizeLimitation(size) {
    if (size && !isNaN(size)) {
      this.mmsSizeLimitation = size - this.MMS_SIZE_OVERHEAD;
    }
  },

  // Set default mms service SIM ID and add observer:
  // In DSDS scenario, if we notify user to switch to subscription to retrieve
  // the MMS from non-active subscription, we'll need current mmsServiceId
  // information to tell user the active/non-active subscription
  initServiceId: function initMmsServiceId(settingName, propName, id) {
    if (id !== undefined) {
      Settings[propName] = id;
    }
    navigator.mozSettings.addObserver(settingName, function(e) {
      Settings[propName] = e.settingValue;
    });
  },

  setMmsSimServiceId: function setSimServiceId(id) {
    // DSDS: mms & data are both necessary for connection switch.
    navigator.mozSettings.createLock().set({
      'ril.mms.defaultServiceId': id,
      'ril.data.defaultServiceId': id
    });
  },

  switchMmsSimHandler: function switchSimHandler(targetId) {
    var conn = window.navigator.mozMobileConnections[targetId];
    return new Promise(function(resolve, reject) {
      if (conn) {
        if (conn.data.state === 'registered') {
          // Call resolve directly if state is registered already
          resolve();
        } else {
          // Listen to MobileConnections datachange to make sure we can start
          // to retrieve mms only when data.state is registered. But we can't
          // guarantee datachange event will work in other device.
          conn.addEventListener('datachange', function onDataChange() {
            if (conn.data.state === 'registered') {
              conn.removeEventListener('datachange', onDataChange);
              resolve();
            }
          });

          this.setMmsSimServiceId(targetId);
        }
      } else {
        reject('Invalid connection');
      }
    }.bind(this));
  },

  /**
   * returns true if the device has more than 1 SIM port
   */
  isDualSimDevice: function isDualSimDevice() {
    return this._serviceIds && this._serviceIds.length > 1;
  },

  /**
   * Returns true if the device has more than 1 SIM port and at least 2 SIMs are
   * inserted.
   */
  hasSeveralSim: function hasSeveralSim() {
    if (!this.isDualSimDevice()) {
      return false;
    }

    var simCount = this._serviceIds.reduce(function(simCount, iccId) {
      return iccId === null ? simCount : simCount + 1;
    }, 0);

    return simCount > 1;
  },

  getServiceIdByIccId: function getServiceIdByIccId(iccId) {
    if (!this._serviceIds) {
      return null;
    }

    var index = this._serviceIds.indexOf(iccId);

    return index > -1 ? index : null;
  },

  setReadAheadThreadRetrieval: function(value) {
    if (!navigator.mozSettings) {
      return;
    }

    var setting = {};
    setting[this.READ_AHEAD_THREADS_KEY] = value;
    navigator.mozSettings.createLock().set(setting);
  }
};
