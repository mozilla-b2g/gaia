/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(exports) {
  'use strict';

  // This json file should always be accessed from the root instead of the
  // current working base URL so that it can work in unit-tests as well
  // as during normal run time.
  var OPERATOR_VARIANT_FILE = '/shared/resources/apn.json';

  var APN_TYPES = ['default', 'mms', 'supl'];
  var AUTH_TYPES = ['none', 'pap', 'chap', 'papOrChap'];
  var DEFAULT_MMS_SIZE_LIMITATION = 300 * 1024;

  /**
   * Helper object that handles some carrier-specific settings on the ICC card
   * from the mozMobileConnection.
   */
  function OperatorVariantHandler(iccId, iccCardIndex) {
    /** Index of the ICC card on the mozMobileConnections array */
    this._iccCardIndex = iccCardIndex;
    /** ICC id in the ICC card */
    this._iccId = iccId;
    /** Operator variant helper object */
    this._operatorVariantHelper = null;
    /** MCC and MNC values */
    this._iccSettings = { mcc: '000', mnc: '00' };
  }

  OperatorVariantHandler.prototype = {
    /**
     * Init function.
     */
    init: function ovh_init() {
      // Set some carrier settings on startup and when the SIM card is changed.
      this._operatorVariantHelper =
        new OperatorVariantHelper(
          this._iccId,
          this._iccCardIndex,
          this.applySettings.bind(this),
          'operatorvariant.customization.' + this._iccId,
          true);

      // Listen for changes in MCC/MNC values.
      this._operatorVariantHelper.listen();
    },

    /**
     * Utility function to pad a number with leading zeros and transform it
     * into a string.
     *
     * @param {Number} num The number to pad with leading zeros.
     * @param {Number} length The final length the number should have,
     *                        in characters.
     */
    padLeft: function ovh_padLeft(num, length) {
      var r = String(num);
      while (r.length < length) {
        r = '0' + r;
      }
      return r;
    },


    /**
     * Apply the carrier settings relaying on the MCC and MNC values. This
     * function must be called only once when the device boots with a new ICC
     * card or when the device boots with the same ICC card and the
     * customization has not been applied yet.
     *
     * @param {String} mcc Mobile Country Code in the ICC card.
     * @param {String} mnc Mobile Network Code in the ICC card.
     */
    applySettings: function ovh_applySettings(mcc, mnc) {
      // Save MCC and MNC codes.
      this._iccSettings.mcc = mcc;
      this._iccSettings.mnc = mnc;
      this.retrieveOperatorVariantSettings(
        this.applyOperatorVariantSettings.bind(this)
      );
      this.retrieveWAPUserAgentProfileSettings(
        this.applyWAPUAProfileUrl.bind(this)
      );

      this._operatorVariantHelper.applied();
    },

    /**
     * Retrieve the settings and call the callback function.
     *
     * @param {function} callback Callback function to be called once the
     *                            settings have been retrieved.
     */
    retrieveOperatorVariantSettings:
      function ovh_retrieveOperatorVariantSettings(callback) {

      var self = this;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', OPERATOR_VARIANT_FILE, true);
      xhr.responseType = 'json';
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
          var apn = xhr.response;

          // The apn.json generator strips out leading zeros for mcc values. No
          // need for padding in this instance.
          var mcc = self._iccSettings.mcc;

          // We must pad the mnc value and turn it into a string otherwise
          // we could *fail* to load the appropriate settings for single digit
          // *mnc* values!
          var mnc = self.padLeft(self._iccSettings.mnc, 2);

          // get a list of matching APNs
          var compatibleAPN = apn[mcc] ? (apn[mcc][mnc] || []) : [];
          callback(compatibleAPN);
        }
      };
      xhr.send();
    },

    /**
     * Store the carrier settings.
     *
     * @param {Array} result Settings to be stored.
     */
    applyOperatorVariantSettings:
      function ovh_applyOperatorVariantSettings(result) {
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
          'ril.sms.strict7BitEncoding.enabled':
            'enableStrict7BitEncodingForSms',
          'ril.cellbroadcast.searchlist': 'cellBroadcastSearchList',
          'dom.mms.operatorSizeLimitation': 'operatorSizeLimitation'
        }
      };

      var booleanPrefNames = [
        'ril.sms.strict7BitEncoding.enabled'
      ];

      // store relevant APN settings
      var settings = window.navigator.mozSettings;
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

      this.buildApnSettings(result);
    },

    /**
     * Helper function.
     */
    canHandleType: function ovh_canHandleType(apn, type) {
      return (apn.type && (apn.type.indexOf(type) != -1));
    },

    /**
     * Build the data call settings for the new APN setting architecture.
     *
     * @param {Array} allApnList The array of settings used for bulding the data
     *                           call ones.
     * @return {Array} The data call settings.
     */
    buildApnSettings: function ovh_buildApnSettings(allApnList) {
      var tmpApnSettings = [];
      var apnSettings = [];
      var validApnFound = false;

      for (var i = 0; i < APN_TYPES.length; i++) {
        var type = APN_TYPES[i];

        // Let's find out an APN in the list being capable of handling the type.
        // A valid APN might be already included, let's search it.
        validApnFound = false;
        for (var j = 0; j < tmpApnSettings.length; j++) {
          if (this.canHandleType(tmpApnSettings[j], type)) {
            validApnFound = true;
            break;
          }
        }
        if (validApnFound) {
          // Already have a valid APN, let's go for the next APN type.
          continue;
        }
        // There is no valid APN for the type, use the first APN in the list.
        for (var k = 0; k < allApnList.length; k++) {
          if (this.canHandleType(allApnList[k], type)) {
            if (allApnList[k].type.length > 1) {
              var tmpApn = JSON.parse(JSON.stringify(allApnList[k]));
              delete tmpApn.type;
              tmpApn.type = [];
              tmpApn.type.push(type);
              tmpApnSettings.push(tmpApn);
              break;
            }
            tmpApnSettings.push(allApnList[k]);
            break;
          }
        }
      }

      // Change property mane 'type' by 'types'.
      // Change values for 'authtype' property as the ones that gecko expects.
      for (var l = 0; l < tmpApnSettings.length; l++) {
        var apn = tmpApnSettings[l];
        apn.types = [];
        apn.type.forEach(function forEachApnType(type) {
          apn.types.push(type);
        });
        delete apn.type;
        if (apn.authtype) {
          apn.authtype = AUTH_TYPES[apn.authtype] || 'notDefined';
        }
        apnSettings.push(apn);
      }

      // Store settings into the database.
      var settings = window.navigator.mozSettings;
      var transaction = settings.createLock();

      var request = transaction.get('ril.data.apnSettings');
      request.onsuccess = (function() {
        var result = request.result['ril.data.apnSettings'];
        if (!result || !Array.isArray(result)) {
          result = [[], []];
        }
        result[this._iccCardIndex] = apnSettings;

        transaction.set({'ril.data.apnSettings': result});
      }).bind(this);
    },

    /**
     * Retrieve the user agent profile setting from /resources/wapuaprof.json
     *  and find out the user agent URL for current mcc and mnc codes.
     *
     * @param {function} callback Callback function to be called once the
     *                             settings have been retrieved.
     */
    retrieveWAPUserAgentProfileSettings:
      function ovh_retrieveWAPUserAgentProfileSettings(callback) {

      var self = this;
      var WAP_UA_PROFILE_FILE = '/resources/wapuaprof.json';
      var DEFAULT_KEY = '000000';

      var xhr = new XMLHttpRequest();
      xhr.open('GET', WAP_UA_PROFILE_FILE, true);
      xhr.responseType = 'json';
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
          var uaprof = xhr.response;
          // normalize mcc, mnc as zero padding string.
          var mcc = self.padLeft(self._iccSettings.mcc, 3);
          var mnc = self.padLeft(self._iccSettings.mnc, 3);

          // Get the ua profile url with mcc/mnc. Fallback to default if no
          // record found. If still not found, we use undefined as the default
          // value
          var uaProfile = uaprof[mcc + mnc] || uaprof[DEFAULT_KEY];
          callback(uaProfile);
        }
      };
      xhr.send();
    },

    /**
     * Store the user agent profile setting into the setting database.
     */
    applyWAPUAProfileUrl: function ovh_applyWAPUAProfileUrl(uaProfile) {
      var settings = window.navigator.mozSettings;
      var transaction = settings.createLock();
      var urlValue = uaProfile ? uaProfile.url : undefined;
      transaction.set({'wap.UAProf.url': urlValue});
    }
  };

  /**
   * Handle some carrier-specific settings on the ICC card whose id  we pass as
   * parameter.
   *
   * @param {String} iccId The iccId code form the ICC card.
   * @param {Numeric} iccCardIndex Index of the ICC card on the
   *                               mozMobileConnections array.
   *
   * @return {Object} A OperatorVariantHandler object.
   */
  OperatorVariantHandler.handleICCCard =
    function ovh_handleICCCard(iccId, iccCardIndex) {
    var obj = new OperatorVariantHandler(iccId, iccCardIndex);
    obj.init();

    return obj;
  };


  exports.OperatorVariantHandler = OperatorVariantHandler;
})(window);
