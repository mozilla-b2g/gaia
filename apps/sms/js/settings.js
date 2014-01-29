'use strict';
/*
  Message app settings related value and utilities.
*/

var Settings = {
  MMS_SERVICE_ID_KEY: 'ril.mms.defaultServiceId',

  mmsSizeLimitation: 300 * 1024, // Default mms message size limitation is 300K.
  mmsServiceId: null, // Default mms service SIM ID (only for DSDS)
  get nonActivateMmsServiceIds() { // Non activate mms ID (only for DSDS)
    var serviceIds = this.serviceIds.slice();
    serviceIds.splice(this.mmsServiceId, 1);
    return serviceIds;
  },

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

    if (!settings) {
      return;
    }

    // Only DSDS will need to handle mmsServiceId
    if (conns && conns.length > 1) {
      keyHandlerSet[this.MMS_SERVICE_ID_KEY] = this.initMmsServiceId;
      // Cache all existing serviceIds
      this.serviceIds = [];
      for (var i = 0, l = conns.length; i < l; i++) {
        this.serviceIds.push(i);
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
  }
};
