'use strict';

var DataMobile = {
  key: 'ril.data.enabled',
  apnRetrieved: false,
  init: function dm_init() {
    var settings = window.navigator.mozSettings;
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
    self.apnRetrieved = true;
    this.isDataAvailable = status;
    if (callback)
      callback();
  },
  // TODO: Bug 883298 - [FTU] Check whether there is no need to retrieve the APN
  // settings from the apn.json database
  getAPN: function dm_getapn(callback) {
    // TODO Use 'shared' version
    var APN_FILE = '/shared/resources/apn.json';
    var self = this;
    // Retrieve the list of APN configurations
    // load and query APN database, then trigger callback on results
    var xhr = new XMLHttpRequest();
    xhr.open('GET', APN_FILE, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        // TODO: read mcc and mnc codes from 'operatorvariant.{mcc, mnc}'.
        var mcc = IccHelper.iccInfo.mcc;
        var mnc = IccHelper.iccInfo.mnc;
        var apnList = xhr.response;
        var apns = apnList[mcc] ? (apnList[mcc][mnc] || []) : [];
        // Looks for a valid APN configuration for data calls.
        var selectedAPN = {};
        for (var i = 0; i < apns.length; i++) {
          if (apns[i] && apns[i].type.indexOf('default') != -1) {
            selectedAPN = apns[i];
            break;
          }
        }
        // Set data in 'Settings'
        var lock = self.settings.createLock();
        lock.set({ 'ril.data.apn': selectedAPN.apn || '' });
        lock.set({ 'ril.data.user': selectedAPN.user || '' });
        lock.set({ 'ril.data.passwd': selectedAPN.password || '' });
        lock.set({ 'ril.data.httpProxyHost': selectedAPN.proxy || '' });
        lock.set({ 'ril.data.httpProxyPort': selectedAPN.port || '' });
        if (callback) {
          callback();
        }
      }
    };
    xhr.send();
  }
};
