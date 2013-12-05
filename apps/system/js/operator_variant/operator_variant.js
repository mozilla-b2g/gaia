/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function OperatorVariant() {
  // MCC and MNC values.
  var iccSettings = { mcc: '000', mnc: '00' };

  /**
   * Utility function to pad a number with leading zeros and transform it
   * into a string.
   *
   * @param {Number} num The number to pad with leading zeros.
   * @param {Number} length The final length the number should have,
   *                        in characters.
   */
  function padLeft(num, length) {
    var r = String(num);
    while (r.length < length) {
      r = '0' + r;
    }
    return r;
  }

  /**
   * Set some carrier settings on startup and when the SIM card is changed.
   */
  var operatorVariantHelper =
    new OperatorVariantHelper(applySettings.bind(this),
                              'operatorvariant.customization',
                              true);

  // Listen for changes in MCC/MNC values.
  operatorVariantHelper.listen();

  /**
   * Apply the carrier settings relaying on the MCC and MNC values. This
   * function must be called only once when the device boots with a new ICC
   * card or when the device boots with the same ICC card and the
   * customization has not been applied yet.
   *
   * @param {String} mcc Mobile Country Code in the ICC card.
   * @param {String} mnc Mobile Network Code in the ICC card.
   */
  function applySettings(mcc, mnc) {
    // Save MCC and MNC codes.
    iccSettings.mcc = mcc;
    iccSettings.mnc = mnc;

    retrieveOperatorVariantSettings(applyOperatorVariantSettings);
    retrieveWAPUserAgentProfileSettings(applyWAPUAProfileUrl);

    operatorVariantHelper.applied();
  }

  /**
   * Retrieve the settings and call the callback function.
   *
   * @param {function} callback Callback function to be called once the settings
   *                            have been retrieved.
   */
  function retrieveOperatorVariantSettings(callback) {
    // This json file should always be accessed from the root instead of the
    // current working base URL so that it can work in unit-tests as well
    // as during normal run time.
    var OPERATOR_VARIANT_FILE = '/shared/resources/apn.json';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', OPERATOR_VARIANT_FILE, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        var apn = xhr.response;

        // The apn.json generator strips out leading zeros for mcc values. No
        // need for padding in this instance.
        var mcc = iccSettings.mcc;

        // We must pad the mnc value and turn it into a string otherwise
        // we could *fail* to load the appropriate settings for single digit
        // *mnc* values!
        var mnc = padLeft(iccSettings.mnc, 2);

        // get a list of matching APNs
        var compatibleAPN = apn[mcc] ? (apn[mcc][mnc] || []) : [];
        callback(compatibleAPN);
      }
    };
    xhr.send();
  }

  /**
   * Store the carrier settings.
   *
   * @param {Array} result Settings to be stored.
   */
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
    var transaction = navigator.mozSettings.createLock();
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

    buildApnSettings(result);
  }

  /**
   * Build the data call settings for the new APN setting architecture.
   *
   * @param {Array} result The array of settings used for bulding the data call
   *                       ones.
   * @return {Array} The data call settings.
   */
  function buildApnSettings(result) {
    var apnSettings = [];
    var apnTypeCandidates = ['default', 'supl', 'mms'];
    var checkedType = [];
    var transaction = navigator.mozSettings.createLock();
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
  }

  /**
   * Retrieve the user agent profile setting from /resources/wapuaprof.json and
   * find out the user agent URL for current mcc and mnc codes.
   *
   * @param {function} callback Callback function to be called once the settings
   *                            have been retrieved.
   */
  function retrieveWAPUserAgentProfileSettings(callback) {
    var WAP_UA_PROFILE_FILE = '/resources/wapuaprof.json';
    var DEFAULT_KEY = '000000';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', WAP_UA_PROFILE_FILE, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        var uaprof = xhr.response;
        // normalize mcc, mnc as zero padding string.
        var mcc = padLeft(iccSettings.mcc, 3);
        var mnc = padLeft(iccSettings.mnc, 3);

        // Get the ua profile url with mcc/mnc. Fallback to default if no
        // record found. If still not found, we use undefined as the default
        // value
        var uaProfile = uaprof[mcc + mnc] || uaprof[DEFAULT_KEY];
        callback(uaProfile);
      }
    };
    xhr.send();
  }

  /**
   * Store the user agent profile setting into the setting database.
   */
  function applyWAPUAProfileUrl(uaProfile) {
    var transaction = navigator.mozSettings.createLock();
    var urlValue = uaProfile ? uaProfile.url : undefined;
    transaction.set({'wap.UAProf.url': urlValue});
  }

})();
