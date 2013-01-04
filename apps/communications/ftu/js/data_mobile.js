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
  toggle: function dm_toggle(status) {
    var options = {};
    options[this.key] = status;
    if (!this.apnRetrieved) {
      // I need to retrieve APN
      var self = this;
      this.getAPN(function() {
        DataMobile.settings.createLock().set(options);
        DataMobile.apnRetrieved = true;
        DataMobile.isDataAvailable = status;
      });
      return;
    }
    this.settings.createLock().set(options);
    this.isDataAvailable = status;
  },
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
        var mcc = navigator.mozMobileConnection.iccInfo.mcc;
        var mnc = navigator.mozMobileConnection.iccInfo.mnc;
        var apnList = xhr.response;
        var apns = apnList[mcc] ? (apnList[mcc][mnc] || []) : [];
        var selectedAPN = apns[0];
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
