'use strict';

var DataMobile = {
  key: 'ril.data.enabled',
  apnRetrieved: false,
  init: function dm_init() {
    var settings = navigator.mozSettings;
    if (!settings) {
      console.log('Settings is not available');
      return;
    }
    this.settings = settings;
  },
  getStatus: function dm_getStatus(callback) {
    var request = this.settings.createLock().get(this.key);
    var self = this;
    request.onsuccess = function gst_success() {
      var currentStatus = request.result[self.key];
      self.isDataAvailable = currentStatus;
      callback(currentStatus);
    };
    request.onerror = function gst_error() {
      console.log('Error retrieving ril.data.enabled');
    };
  },
  toggle: function dm_toggle(status, callback) {
    var options = {};
    options[this.key] = status;
    if (!this.apnRetrieved) {
      // I need to retrieve APN
      var self = this;
      this.getAPN(function apn_recovered() {
        self.settings.createLock().set(options);
        self.apnRetrieved = true;
        self.isDataAvailable = status;
        if (callback)
          callback();
      });
      return;
    }
    this.settings.createLock().set(options);
    this.apnRetrieved = true;
    this.isDataAvailable = status;
    if (callback)
      callback();
  },
  getAPN: function dm_getapn(callback) {
    // By the time the APN settings are needed in the FTU before enabling data
    // calls the system app (through the operator variant logic) might store the
    // APN settings into the settings database. If not wait for that before
    // enabling data calls.
    var _self = this;
    function ensureApnSettings() {
      var req = _self.settings.createLock().get('ril.data.apnSettings');
      req.onsuccess = function loadApn() {
        var apnSettings = req.result['ril.data.apnSettings'];
        if (apnSettings) {
          if (callback) {
            callback(req.result);
          }
          _self.settings.removeObserver('ril.data.apnSettings',
                                        ensureApnSettings);
        }
      };
    }

    ensureApnSettings();
    this.settings.addObserver('ril.data.apnSettings', ensureApnSettings);
  }
};
