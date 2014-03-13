/*
  Message app settings related value and utilities.
*/

/* global MobileOperator*/

/* exported Settings */


'use strict';

var Settings = {
  SERVICE_ID_KEYS: {
    mmsServiceId: 'ril.mms.defaultServiceId',
    smsServiceId: 'ril.sms.defaultServiceId'
  },

  _serviceIds: null,

  mmsSizeLimitation: 300 * 1024, // Default mms message size limitation is 300K.
  mmsServiceId: null, // Default mms service SIM ID (only for DSDS)

  init: function settings_init() {
    var keyHandlerSet = {
      'dom.mms.operatorSizeLimitation': Settings.initMmsSizeLimitation
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

  switchMmsSimHandler: function switchSimHandler(targetId, callback) {
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

      this.setMmsSimServiceId(targetId);
    }
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

  /**
   * Will return SIM1 or SIM2 (locale dependent) depending on the iccId.
   * Will return the empty string in a single SIM scenario.
   */
  getSimNameByIccId: function getSimNameByIccId(iccId) {
    var index = this.getServiceIdByIccId(iccId);
    if (index === null) {
      return '';
    }

    var simName = navigator.mozL10n.get('sim-name', { id: index + 1 });
    return simName;
  },

  /**
   * Will return operator name depending on the iccId.
   * Will return the empty string in a single SIM scenario.
   */
  getOperatorByIccId: function getOperatorByIccId(iccId) {
    var index = this.getServiceIdByIccId(iccId);
    if (index === null) {
      return '';
    }

    var conn = navigator.mozMobileConnections[index];
    return MobileOperator.userFacingInfo(conn).operator;
  }
};
