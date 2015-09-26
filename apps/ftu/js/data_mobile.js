/* exported DataMobile */
/* global Navigation */
/* global UIManager */

'use strict';

var DataMobile = {
  name: 'datamobile',
  key: 'ril.data.enabled',
  keySV: 'ftu.ril.data.enabled',
  STEP_DATA_3G: 2,
  apnRetrieved: false,

  init: function dm_init() {
    var settings = navigator.mozSettings;
    if (!settings) {
      console.log('Settings is not available');
      return;
    }
    this.settings = settings;
    var readyEvent = new CustomEvent('panelready', { detail: this });
    window.dispatchEvent(readyEvent);
  },

  removeSVStatusObserver: function dm_removeSVStatusObserver() {
    this.settings.removeObserver(this.keySV, this.getStatus);
  },

  getStatus: function dm_getStatus(aCallback) {
    var self = this;
    var reqSV = this.settings.createLock().get(this.keySV);
    reqSV.onsuccess = function gst_svsuccess() {
      // We need to be sure that we are on Cellular Data screen
      // if the user has passed the screen very fast this configuration will
      // have no effect
      var svStatus = reqSV.result[self.keySV];
      if (svStatus !== undefined && !UIManager.dataConnectionChangedByUsr) {
        self.settings.removeObserver(self.keySV, self.getStatus);
        if (Navigation.currentStep === self.STEP_DATA_3G) {
          self.toggle(svStatus);
          if (typeof aCallback === 'function') {
            aCallback(svStatus);
          }
        } else {
          self.getRealStatus(aCallback);
        }
      } else {
        self.getRealStatus(aCallback);
      }
    };

    reqSV.onerror = function gst_error() {
      console.log('Error retrieving ' + self.keySV);
    };

    this.settings.addObserver(this.keySV, this.getStatus.bind(this, aCallback));
  },

  getRealStatus: function dm_getRealStatus(callback) {
    var request = this.settings.createLock().get(this.key);
    var self = this;
    request.onsuccess = function gst_success() {
      var currentStatus = request.result[self.key];
      self.isDataAvailable = currentStatus;
      callback(currentStatus);
    };
    request.onerror = function gst_error() {
      console.log('Error retrieving ' + self.key);
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
        if (callback) {
          callback();
        }
      });
      return;
    }
    this.settings.createLock().set(options);
    this.apnRetrieved = true;
    this.isDataAvailable = status;
    if (callback) {
      callback();
    }
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
