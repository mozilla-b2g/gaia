/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function OperatorVariant() {
  /**
   * Get the mcc/mnc info that has been stored in the settings.
   */

  var settings = window.navigator.mozSettings;
  if (!settings)
    return;

  var iccSettings = { mcc: -1, mnc: -1 };

  // Read the mcc/mnc settings, then trigger callback.
  function getICCSettings(callback) {
    var transaction = settings.createLock();
    var mccKey = 'operatorvariant.mcc';
    var mncKey = 'operatorvariant.mnc';

    var mccRequest = transaction.get(mccKey);
    mccRequest.onsuccess = function() {
      iccSettings.mcc = parseInt(mccRequest.result[mccKey], 10) || 0;
      var mncRequest = transaction.get(mncKey);
      mncRequest.onsuccess = function() {
        iccSettings.mnc = parseInt(mncRequest.result[mncKey], 10) || 0;
        callback();
      };
    };
  }


  /**
   * Compare the cached mcc/mnc info with the one in the SIM card,
   * and retrieve/apply APN settings if they differ.
   */

  var mobileConnection = window.navigator.mozMobileConnection;
  if (!mobileConnection)
    return;

  // Check the mcc/mnc information on the SIM card.
  function checkICCInfo() {
    if (!mobileConnection.iccInfo || mobileConnection.cardState !== 'ready')
      return;

    // ensure that the iccSettings have been retrieved
    if ((iccSettings.mcc < 0) || (iccSettings.mnc < 0))
      return;

    // XXX sometimes we get 0/0 for mcc/mnc, even when cardState === 'ready'...
    var mcc = parseInt(mobileConnection.iccInfo.mcc, 10) || 0;
    var mnc = parseInt(mobileConnection.iccInfo.mnc, 10) || 0;
    if (!mcc || !mnc)
      return;

    // same SIM card => do nothing
    if ((mcc == iccSettings.mcc) && (mnc == iccSettings.mnc))
      return;

    // new SIM card => cache iccInfo, load and apply new APN settings
    iccSettings.mcc = mcc;
    iccSettings.mnc = mnc;
    retrieveOperatorVariantSettings(applyOperatorVariantSettings);
  };

  // Load and query APN database, then trigger callback on results.
  function retrieveOperatorVariantSettings(callback) {
    var OPERATOR_VARIANT_FILE = 'shared/resources/apn.json';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', OPERATOR_VARIANT_FILE, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        var apn = xhr.response;
        var mcc = iccSettings.mcc;
        var mnc = iccSettings.mnc;
        // get a list of matching APNs
        var compatibleAPN = apn[mcc] ? (apn[mcc][mnc] || []) : [];
        callback(compatibleAPN);
      }
    };
    xhr.send();
  }

  // Store APN settings for the first carrier matching the mcc/mnc info.
  function applyOperatorVariantSettings(result) {
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
      'operatorvariant.mcc': iccSettings.mcc,
      'operatorvariant.mnc': iccSettings.mnc
    });
  }


  /**
   * Check the APN settings on startup and when the SIM card is changed.
   */

  getICCSettings(checkICCInfo);
  mobileConnection.addEventListener('iccinfochange', checkICCInfo);
})();

