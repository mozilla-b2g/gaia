/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var OperatorVariantManager = {
  OPERATOR_VARIANT_FILE: 'shared/resources/apn.json',
  iccSettings: { mcc: -1, mnc: -1 },

  init: function ovm_init() {
    var settings, mobileConnection;

    settings = navigator.mozSettings;
    mobileConnection = navigator.mozMobileConnection;
    if (!settings || !mobileConnection) {
      return;
    }

    // Get the mcc/mnc info that has been stored in the settings.
    this.getICCSettings(this.checkICCInfo);
    mobileConnection.addEventListener('iccinfochange', this);
  },

  handleEvent: function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'iccinfochange':
        this.checkICCInfo();
        break;
    }
  },

  /**
   * Read the mcc/mnc settings, then trigger callback.
   */
  getICCSettings: function omv_getICCSettings(callback) {
    var settings = navigator.mozSettings;
    if (!settings) {
      return;
    }
    var transaction = settings.createLock();
    var mccKey = 'operatorvariant.mcc';
    var mncKey = 'operatorvariant.mnc';

    var mccRequest = transaction.get(mccKey);
    mccRequest.onsuccess = function() {
      OperatorVariantManager.iccSettings.mcc =
        parseInt(mccRequest.result[mccKey], 10) || 0;
      var mncRequest = transaction.get(mncKey);
      mncRequest.onsuccess = function() {
        OperatorVariantManager.iccSettings.mnc =
          parseInt(mncRequest.result[mncKey], 10) || 0;
        callback();
      };
    };
  },

  /**
   * Check the mcc/mnc information on the SIM card.
   */
  checkICCInfo: function omv_checkICCInfo() {
    var mobileConnection = navigator.mozMobileConnection;
    if (!mobileConnection) {
      return;
    }
    if (!mobileConnection.iccInfo ||
        mobileConnection.cardState !== 'ready') {
      return;
    }

    // ensure that the iccSettings have been retrieved
    if ((this.iccSettings.mcc < 0) || (this.iccSettings.mnc < 0))
      return;

    // XXX sometimes we get 0/0 for mcc/mnc, even when cardState === 'ready'...
    var mcc = parseInt(mobileConnection.iccInfo.mcc, 10) || 0;
    var mnc = parseInt(mobileConnection.iccInfo.mnc, 10) || 0;
    if (!mcc || !mnc)
      return;

    // same SIM card => do nothing
    if ((mcc == this.iccSettings.mcc) && (mnc == this.iccSettings.mnc))
      return;

    // new SIM card => cache iccInfo, load and apply new APN settings
    this.iccSettings.mcc = mcc;
    this.iccSettings.mnc = mnc;
    this.retrieveOperatorVariantSettings(this.applyOperatorVariantSettings);
  },

  /**
   * Load and query APN database, then trigger callback on results.
   */
  retrieveOperatorVariantSettings:
    function ovm_retrieveOperatorVariantSettings(callback) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.OPERATOR_VARIANT_FILE, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        var apn = xhr.response;
        var mcc = OperatorVariantManager.iccSettings.mcc;
        var mnc = OperatorVariantManager.iccSettings.mnc;
        // get a list of matching APNs
        var compatibleAPN = apn[mcc] ? (apn[mcc][mnc] || []) : [];
        callback(compatibleAPN);
      }
    };
    xhr.send();
  },

  /**
   * Store APN settings for the first carrier matching the mcc/mnc info.
   */
  applyOperatorVariantSettings: function ovm_applyOperatorVariantSettings(result) {
    var settings = navigator.mozSettings;
    if (!settings) {
      return;
    }

    var apnPrefNames = {
      'default': {
        'ril.data.carrier': 'carrier',
        'ril.data.apn': 'apn',
        'ril.data.user': 'user',
        'ril.data.passwd': 'password',
        'ril.data.httpProxyHost': 'proxy',
        'ril.data.httpProxyPort': 'port'
      },
      'supl': {
        'ril.supl.carrier': 'carrier',
        'ril.supl.apn': 'apn',
        'ril.supl.user': 'user',
        'ril.supl.passwd': 'password',
        'ril.supl.httpProxyHost': 'proxy',
        'ril.supl.httpProxyPort': 'port'
      },
      'mms': {
        'ril.mms.carrier': 'carrier',
        'ril.mms.apn': 'apn',
        'ril.mms.user': 'user',
        'ril.mms.passwd': 'password',
        'ril.mms.httpProxyHost': 'proxy',
        'ril.mms.httpProxyPort': 'port',
        'ril.mms.mmsc': 'mmsc',
        'ril.mms.mmsproxy': 'mmsproxy',
        'ril.mms.mmsport': 'mmsport'
      },
      'operatorvariant': {
        'ril.iccInfo.mbdn': 'voicemail',
        'ril.sms.strict7BitEncoding.enabled': 'enableStrict7BitEncodingForSms',
        'ril.cellbroadcast.searchlist': 'cellBroadcastSearchList'
      }
    };

    var booleanPrefNames = [
      'ril.sms.strict7BitEncoding.enabled'
    ];

    // store relevant APN settings
    var transaction = settings.createLock();
    for (var type in apnPrefNames) {
      var apn = {};
      for (var i = 0; i < result.length; i++) {
        if (result[i] && result[i].type.indexOf(type) != -1) {
          apn = result[i];
          break;
        }
      }
      var prefNames = apnPrefNames[type];
      for (var key in prefNames) {
        var name = apnPrefNames[type][key];
        var item = {};
        if (booleanPrefNames.indexOf(key) != -1) {
          item[key] = apn[name] || false;
        } else {
          item[key] = apn[name] || '';
        }
        transaction.set(item);
      }
    }

    // store the current mcc/mnc info in the settings
    transaction.set({
      'operatorvariant.mcc': OperatorVariantManager.iccSettings.mcc,
      'operatorvariant.mnc': OperatorVariantManager.iccSettings.mnc
    });
  }
};

// Check the APN settings on startup and when the SIM card is changed.
// Compare the cached mcc/mnc info with the one in the SIM card, and
// retrieve/apply APN settings if they differ.
OperatorVariantManager.init();
