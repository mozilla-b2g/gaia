/* globals ApnHelper, LazyLoader, OperatorVariantHelper */

(function(exports) {
  'use strict';
  // Prefix for the persist key.
  var PERSIST_KEY_PREFIX = 'operatorvariant';
  // Sufix for the persist key.
  var PERSIST_KEY_SUFIX = 'customization';

  // This json file should always be accessed from the root instead of the
  // current working base URL so that it can work in unit-tests as well
  // as during normal run time.
  var OPERATOR_VARIANT_FILE = '/shared/resources/apn.json';

  var APN_TYPES = ['default', 'mms', 'supl', 'dun', 'ims'];
  var AUTH_TYPES = ['none', 'pap', 'chap', 'papOrChap'];
  var DEFAULT_MMS_SIZE_LIMITATION = 300 * 1024;

  /**
   * Helper object that handles some carrier-specific settings on the ICC card
   * from the mozMobileConnection.
   */
  function OperatorVariantHandler(iccId, iccCardIndex, manager) {
    this.manager = manager;
    /** Holds the OS version */
    this._deviceInfoOs = manager.deviceInfoOs || 'unknown';
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
     * Run customizations.
     */
    start: function ovh_start() {
      // Set some carrier settings on startup and when the SIM card is changed.
      this._operatorVariantHelper =
        new OperatorVariantHelper(
          this._iccId,
          this._iccCardIndex,
          this.applySettings.bind(this),
          // Pass the persist key.
          PERSIST_KEY_PREFIX + '.' +
          this._deviceInfoOs + '.' +
          'ICC' + this._iccCardIndex + '.' +
          PERSIST_KEY_SUFIX,
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

    clone: function ovh_clone(obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Utility function to merge default apn settings (from apn.json) to
     * existing apn settings.
     *
     * @param {Array} apns
     *                Existing apns.
     * @param {Array} defaultApns
     *                Default apns. Note that in the array there should be no
     *                apn with the carrier name "_custom_".
     */
    mergeAndKeepCustomApnSettings:
      function ovh_mergeApnSettings(apns, defaultApns) {
        var defaultApnsCopy = this.clone(defaultApns);

        // apns might be undefined, do filtering only if it's an Array
        var existingCustomApns = !Array.isArray(apns) ? [] :
          apns.filter(function(apn) {
            return (apn.carrier === '_custom_');
          });

        // Find the apn types of the custom apns.
        var typesOfCustomApn = new Set();
        existingCustomApns.forEach(function(apn) {
          apn.types.forEach(function(type) {
            typesOfCustomApn.add(type);
          });
        });

        // We only need to set the apns of the types that are not covered by
        // the custom apns.
        var apnsToBeSet = defaultApnsCopy.filter(function(apn) {
          // Remove the type that is already covered by the custom apns.
          apn.types = apn.types.filter(function(type) {
            return !typesOfCustomApn.has(type);
          });
          return !!apn.types.length;
        });
        apnsToBeSet = apnsToBeSet.concat(existingCustomApns);

        return apnsToBeSet;
    },

    /**
     * Apply the carrier settings relaying on the MCC and MNC values. This
     * function must be called only once when the device boots with a new ICC
     * card or when the device boots with the same ICC card and the
     * customization has not been applied yet.
     *
     * @param {String}  mcc Mobile Country Code in the ICC card.
     * @param {String}  mnc Mobile Network Code in the ICC card.
     * @param {Boolean} persistKeyNotSet The customization didn't run for
     *                                   current OS version. Flag.
     */
    applySettings: function ovh_applySettings(mcc, mnc, persistKeyNotSet) {
      // Save MCC and MNC codes.
      this._iccSettings.mcc = mcc;
      this._iccSettings.mnc = mnc;

      this.retrieveOperatorVariantSettings(function(result) {
        this.buildCompleteDefaultApnSettings(result);

        if (!persistKeyNotSet) {
          this.applyOperatorVariantSettings(result);
          this.retrieveWAPUserAgentProfileSettings(
            this.applyWAPUAProfileUrl.bind(this)
          );
        } else {
          this.filterApnsByMvnoRules(0, result, [], '', '',
            (function onFinishCb(filteredApnList) {
              this.buildApnSettings(filteredApnList);
          }).bind(this));
          this.applyCellBroadcastSearchList(result);
        }
      }.bind(this));

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
      LazyLoader.getJSON(OPERATOR_VARIANT_FILE).then(function(apn) {
        // The apn.json generator strips out leading zeros for mcc values. No
        // need for padding in this instance.
        var mcc = self._iccSettings.mcc;

        // We must pad the mnc value and turn it into a string otherwise
        // we could *fail* to load the appropriate settings for single digit
        // *mnc* values!
        var mnc = self.padLeft(self._iccSettings.mnc, 2);

        // Get the type of the data network
        var networkType = self.manager.mobileConnections[self._iccCardIndex]
                                .data.type;
        LazyLoader.load(['shared/js/apn_helper.js']).then(function() {
          callback(ApnHelper.getCompatible(apn, mcc, mnc, networkType));
        });
      });
    },

    /**
     * Given the list of APNs for the current operator numeric value (MCC and
     * MNC codes in the ICC card) filter those ones matching the MVNO rules.
     * The MVNO rules allow us to pre-select the APN relying on several things
     * such as the IMSI code, the carrier name in the ICC card, etc. This rules
     * could be used as well for non-MVNO carriers that provides different APN
     * for their subscribers relying on the IMSI code in the ICC card.
     *
     */
    filterApnsByMvnoRules: function ovh_filterApnsByMvnoRules(apnIndex,
                                                              allApnList,
                                                              filteredApnList,
                                                              mvnoType,
                                                              mvnoMatchData,
                                                              onFinish) {
      if (apnIndex === allApnList.length) {
        if (onFinish && (typeof onFinish === 'function')) {
          onFinish(filteredApnList);
        }
        return;
      }

      var apn = allApnList[apnIndex];
      var listMvnoType = apn.mvno_type || '';
      var listMvnoMatchData = apn.mvno_match_data || '';

      if (!listMvnoType ||
          (mvnoType && mvnoType === listMvnoType &&
           mvnoMatchData === listMvnoMatchData)) {
          filteredApnList.push(apn);
          return this.filterApnsByMvnoRules(apnIndex + 1,
                                            allApnList,
                                            filteredApnList,
                                            mvnoType,
                                            mvnoMatchData,
                                            onFinish);
      }

      var iccCard = navigator.mozIccManager.getIccById(this._iccId);
      var request = iccCard.matchMvno(listMvnoType, listMvnoMatchData);
      request.onsuccess = (function onSuccessHandler() {
        var match = request.result;
        if (match) {
          filteredApnList = [];
          filteredApnList.push(apn);
          return this.filterApnsByMvnoRules(apnIndex + 1,
                                            allApnList,
                                            filteredApnList,
                                            listMvnoType,
                                            listMvnoMatchData,
                                            onFinish);
        }

        this.filterApnsByMvnoRules(apnIndex + 1,
                                   allApnList,
                                   filteredApnList,
                                   mvnoType,
                                   mvnoMatchData,
                                   onFinish);
      }).bind(this);
      request.onerror = (function onErrorHandler() {
        this.filterApnsByMvnoRules(apnIndex + 1,
                                   allApnList,
                                   filteredApnList,
                                   mvnoType,
                                   mvnoMatchData,
                                   onFinish);
      }).bind(this);
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
        'dun': {
          'ril.dun.carrier': 'carrier',
          'ril.dun.apn': 'apn',
          'ril.dun.user': 'user',
          'ril.dun.passwd': 'password',
          'ril.dun.httpProxyHost': 'proxy',
          'ril.dun.httpProxyPort': 'port',
          'ril.dun.authtype': 'authtype'
        },
        'ims': {
          'ril.ims.carrier': 'carrier',
          'ril.ims.apn': 'apn',
          'ril.ims.user': 'user',
          'ril.ims.passwd': 'password',
          'ril.ims.httpProxyHost': 'proxy',
          'ril.ims.httpProxyPort': 'port',
          'ril.ims.authtype': 'authtype'
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
          if (typeof result[i].type === 'undefined') {
            result[i].type = 'default';
          }
          if (result[i].type.indexOf(type) != -1) {
            apn = result[i];
            break;
          }
        }
        var prefNames = apnPrefNames[type];
        for (var key in prefNames) {
          var name = apnPrefNames[type][key];
          var item = {};
          switch (name) {
            case 'voicemail':
              this.applyVoicemailSettings(result);
              break;

            case 'cellBroadcastSearchList':
              this.applyCellBroadcastSearchList(result);
              break;

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

          if (Object.keys(item).length) {
            transaction.set(item);
          }
        }
      }

      this.filterApnsByMvnoRules(0, result, [], '', '',
        (function onFinishCb(filteredApnList) {
          this.buildApnSettings(filteredApnList);
      }).bind(this));
    },

    /**
     * Get the value of a specific operator vatiant setting.
     *
     * @param {Array} allSettings Carrier settings.
     * @param {String} prop The name of the property to be queried.
     */
    getValueFromOperatorVariantSettings:
      function ovh_getVMNumberFromOperatorVariantSettings(allSettings, prop) {
        var operatorVariantSettings = {};
        for (var i = 0; i < allSettings.length; i++) {
          if (allSettings[i] &&
              allSettings[i].type.indexOf('operatorvariant') != -1) {
            operatorVariantSettings = allSettings[i];
            break;
          }
        }
        // Load the value stored in the apn.json database.
        return operatorVariantSettings[prop] || '';
    },

    /**
     * Store update the operator variant settings to database.
     *
     * @param {String} key The key of the settings field.
     * @param {Object} value The value.
     */
    updateOperatorVariantSettings:
      function ovh_updateOperatorVariantSettings(key, value) {
        var settings = window.navigator.mozSettings;
        var transaction = settings.createLock();

        var request = transaction.get(key);
        request.onsuccess = (function() {
          var originalSetting =
            request.result[key] || ['', ''];

          // If the key is 'ril.iccInfo.mbdn':
          // We should only call to this function when new icc cards detected
          // (not system update) in order to preserve user manual settings.

          // If the key is 'ril.cellbroadcast.searchlist':
          // Note that cellbroad cast search list is never touched by users,
          // we should always apply the new value no matter the function is
          // triggered by changing icc cards or system update.
          originalSetting[this._iccCardIndex] = value;
          var obj = {};
          obj[key] = originalSetting;
          transaction.set(obj);
        }).bind(this);
    },

    /**
     * Store the voicemail settings into the settings database.
     *
     * @param {Array} allSettings Carrier settings.
     */
    applyVoicemailSettings:
      function ovh_applyVoicemailSettings(allSettings) {
        var number = this.getValueFromOperatorVariantSettings(allSettings,
          'voicemail');
        this.updateOperatorVariantSettings('ril.iccInfo.mbdn', number);
    },

    /**
     * Store the cell broadcast settings into the settings database.
     *
     * @param {Array} allSettings Carrier settings.
     */
    applyCellBroadcastSearchList:
      function ovh_applyCellBroadcastSearchList(allSettings) {
        var searchList = this.getValueFromOperatorVariantSettings(allSettings,
          'cellBroadcastSearchList');
        this.updateOperatorVariantSettings('ril.cellbroadcast.searchlist',
          searchList);
    },

    /**
     * Helper function.
     */
    canHandleType: function ovh_canHandleType(apn, type) {
      return (apn.type && (apn.type.indexOf(type) != -1));
    },

    /**
     * Helper function to
     * - Change property mane 'type' by 'types'.
     * - Change values for 'authtype' property as the ones that gecko expects.
     */
    convertApnSettings: function ovh_convertApns(apnSettings) {
      var that = this;
      return apnSettings.map(function(apn) {
        var apnClone = that.clone(apn);
        if (apnClone.type && Array.isArray(apnClone.type)) {
          apnClone.types = apnClone.type.map(function(type) {
            return type;
          });
        }
        delete apnClone.type;
        if (apnClone.authtype) {
          apnClone.authtype = AUTH_TYPES[apnClone.authtype] || 'notDefined';
        }
        return apnClone;
      });
    },

    /**
     * Build all possible apn settings for the current mcc and mnc codes.
     *
     * @param {Array} allApnList The array of settings used for bulding the data
     *                           call ones.
     */
    buildCompleteDefaultApnSettings:
      function ovh_buildCompleteDefaultApnSettings(allApnList) {
        var settings = window.navigator.mozSettings;
        var validApnSettings = allApnList.filter(function(apn) {
          return apn.type && apn.type.indexOf('operatorvariant') == -1;
        });
        validApnSettings = this.convertApnSettings(validApnSettings);

        // Store default apn items to the database.
        var transaction = settings.createLock();
        var request = transaction.get('ril.data.default.apns');
        var mcc = this._iccSettings.mcc;
        var mnc = this._iccSettings.mnc;

        request.onsuccess = (function() {
          var result = request.result['ril.data.default.apns'] || {};
          result[mcc] = result[mcc] || {};
          result[mcc][mnc] = validApnSettings;

          transaction.set({
            'ril.data.default.apns': result
          });
        }).bind(this);
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
              var tmpApn = this.clone(allApnList[k]);
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

      apnSettings = this.convertApnSettings(tmpApnSettings);

      var settings = window.navigator.mozSettings;

      // Store settings into the database and clear the user selection.
      var transaction = settings.createLock();
      var request = transaction.get('ril.data.apnSettings');
      request.onsuccess = (function() {
        var result = request.result['ril.data.apnSettings'];
        if (!result || !Array.isArray(result)) {
          result = [[], []];
        }

        // We should respect to the existing custom settings if any. Instead
        // of overwriting it with "apnSettings" compeletely, we should only
        // overwrite the apn settings that are not configured by custom
        // settings by using the result of "mergeAndKeepCustomApnSettings".
        var existingApnSettings = result[this._iccCardIndex];
        var mergedApnSettings = this.mergeAndKeepCustomApnSettings(
          existingApnSettings, apnSettings);

        result[this._iccCardIndex] = mergedApnSettings;
        transaction.set({
          'ril.data.apnSettings': result,
          'ril.data.default.apnSettings': result,
          'apn.selections': null
        });
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

      LazyLoader.getJSON(WAP_UA_PROFILE_FILE).then(function(uaprof) {
        // normalize mcc, mnc as zero padding string.
        var mcc = self.padLeft(self._iccSettings.mcc, 3);
        var mnc = self.padLeft(self._iccSettings.mnc, 3);

        // Get the ua profile url with mcc/mnc. Fallback to default if no
        // record found. If still not found, we use undefined as the default
        // value
        var uaProfile = uaprof[mcc + mnc] || uaprof[DEFAULT_KEY];
        callback(uaProfile);
      });
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
  exports.OperatorVariantHandler = OperatorVariantHandler;
})(window);
