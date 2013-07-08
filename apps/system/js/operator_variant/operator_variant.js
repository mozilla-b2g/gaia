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

  var iccSettings = { mcc: '-1', mnc: '-1' };

  // Read the mcc/mnc settings, then trigger callback.
  function getICCSettings(callback) {
    var transaction = settings.createLock();
    var mccKey = 'operatorvariant.mcc';
    var mncKey = 'operatorvariant.mnc';

    var mccRequest = transaction.get(mccKey);
    mccRequest.onsuccess = function() {
      iccSettings.mcc = mccRequest.result[mccKey] || '0';
      var mncRequest = transaction.get(mncKey);
      mncRequest.onsuccess = function() {
        iccSettings.mnc = mncRequest.result[mncKey] || '0';
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

  if (!IccHelper.enabled)
    return;

  // Check the mcc/mnc information on the SIM card.
  function checkICCInfo() {
    if (!mobileConnection.iccInfo || IccHelper.cardState !== 'ready')
      return;

    // ensure that the iccSettings have been retrieved
    if ((iccSettings.mcc < 0) || (iccSettings.mnc < 0))
      return;

    // XXX sometimes we get 0/0 for mcc/mnc, even when cardState === 'ready'...
    var mcc = mobileConnection.iccInfo.mcc || '0';
    var mnc = mobileConnection.iccInfo.mnc || '0';
    if (mcc === '0')
      return;

    // avoid setting APN (and operator variant) settings if mcc/mnc codes
    // changes.
    mobileConnection.removeEventListener('iccinfochange', checkICCInfo);

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
        'ril.data.httpProxyPort': 'port',
        'ril.data.authtype': 'authtype'
      },
      'supl': {
        'ril.supl.carrier': 'carrier',
        'ril.supl.apn': 'apn',
        'ril.supl.user': 'user',
        'ril.supl.passwd': 'password',
        'ril.supl.httpProxyHost': 'proxy',
        'ril.supl.httpProxyPort': 'port',
        'ril.supl.authtype': 'authtype'
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
        'ril.mms.mmsport': 'mmsport',
        'ril.mms.authtype': 'authtype'
      },
      'operatorvariant': {
        'ril.iccInfo.mbdn': 'voicemail',
        'ril.sms.strict7BitEncoding.enabled': 'enableStrict7BitEncodingForSms',
        'ril.cellbroadcast.searchlist': 'cellBroadcastSearchList',
        'dom.mms.operatorSizeLimitation': 'operatorSizeLimitation'
      }
    };

    var booleanPrefNames = [
      'ril.sms.strict7BitEncoding.enabled'
    ];

    const AUTH_TYPES = ['none', 'pap', 'chap', 'papOrChap'];
    const DEFAULT_MMS_SIZE_LIMITATION = 300 * 1024;

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
        switch (name) {
          // load values from the AUTH_TYPES
          case 'authtype':
            item[key] = apn[name] ? AUTH_TYPES[apn[name]] : 'notDefined';
            break;

          case 'operatorSizeLimitation':
            item[key] = +apn[name] || DEFAULT_MMS_SIZE_LIMITATION;
            break;

          // all other keys default to empty strings
          default:
            if (booleanPrefNames.indexOf(key) !== -1) {
              item[key] = apn[name] || false;
            } else {
              item[key] = apn[name] || '';
            }
            break;
        }
        transaction.set(item);
      }
    }
    // for new apn settings
    var apnSettings = [];
    var apnTypeCandidates = ['default', 'supl', 'mms'];
    var checkedType = [];
    // converts apns to new format
    for (var i = 0; i < result.length; i++) {
      var sourceAPNItem = result[i];
      //copy types
      var apnTypes = [];

      for (var j = 0; j < sourceAPNItem.type.length; j++) {
        // we only need default, supl, mms, and not duplicate
        if (apnTypeCandidates.indexOf(sourceAPNItem.type[j]) == -1 ||
            checkedType.indexOf(sourceAPNItem.type[j]) != -1) {
          continue;
        }
        apnTypes[apnTypes.length] = sourceAPNItem.type[j];
        checkedType[checkedType.length] = sourceAPNItem.type[j];
      }
      // no valid apnType in this record.
      if (0 == apnTypes.length) {
        continue;
      }
      // got types we want, create types field and remove type field.
      sourceAPNItem['types'] = apnTypes;
      delete sourceAPNItem['type'];
      // add apn bags
      apnSettings.push(sourceAPNItem);
    }
    transaction.set({'ril.data.apnSettings': [apnSettings]});

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

