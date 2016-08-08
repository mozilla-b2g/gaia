'use strict';

require([
  'modules/settings_cache',
  'modules/dialog_service',
  'dsds_settings'
], function(exports, SettingsCache, DialogService, DsdsSettings) {
  /**
   * Singleton object that handles some call settings.
   */
  var CallSettings = (function(window, document, undefined) {
    var _networkTypeCategory = {
      'gprs': 'gsm',
      'edge': 'gsm',
      'umts': 'gsm',
      'hsdpa': 'gsm',
      'hsupa': 'gsm',
      'hspa': 'gsm',
      'hspa+': 'gsm',
      'lte': 'gsm',
      'gsm': 'gsm',
      'is95a': 'cdma',
      'is95b': 'cdma',
      '1xrtt': 'cdma',
      'evdo0': 'cdma',
      'evdoa': 'cdma',
      'evdob': 'cdma',
      'ehrpd': 'cdma'
    };

    var _cfReason = {
      CALL_FORWARD_REASON_UNCONDITIONAL: 0,
      CALL_FORWARD_REASON_MOBILE_BUSY: 1,
      CALL_FORWARD_REASON_NO_REPLY: 2,
      CALL_FORWARD_REASON_NOT_REACHABLE: 3
    };
    var _cfReasonMapping = {
      'unconditional': _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
      'mobilebusy': _cfReason.CALL_FORWARD_REASON_MOBILE_BUSY,
      'noreply': _cfReason.CALL_FORWARD_REASON_NO_REPLY,
      'notreachable': _cfReason.CALL_FORWARD_REASON_NOT_REACHABLE
    };
    var _cfAction = {
      CALL_FORWARD_ACTION_DISABLE: 0,
      CALL_FORWARD_ACTION_ENABLE: 1,
      CALL_FORWARD_ACTION_QUERY_STATUS: 2,
      CALL_FORWARD_ACTION_REGISTRATION: 3,
      CALL_FORWARD_ACTION_ERASURE: 4
    };

    var _clirConstantsMapping = {
      'CLIR_DEFAULT': 0,
      'CLIR_INVOCATION': 1,
      'CLIR_SUPPRESSION': 2
    };

    var _ttyModeConstantsMapping = {
      'TTY_MODE_OFF': 0,
      'TTY_MODE_FULL': 1,
      'TTY_MODE_HCO': 2,
      'TTY_MODE_VCO': 3
    };

    var _settings = window.navigator.mozSettings;
    var _mobileConnections = window.navigator.mozMobileConnections;
    var _voiceTypes = Array.prototype.map.call(_mobileConnections,
      function() { return null; });

    /** mozMobileConnection instance the panel settings rely on */
    var _mobileConnection = null;
    /** Voice service class mask */
    var _voiceServiceClassMask = null;
    /** Stores current states (enabler or not) of the call forwaring reason */
    var _cfReasonStates = [0, 0, 0, 0];
    /** Flag */
    var _ignoreSettingChanges = false;
    /** Flag */
    var _getCallForwardingOptionSuccess = true;
    /** Task scheduler */
    var _taskScheduler = null;
    var _telephony = window.navigator.mozTelephony;

    /**
     * Init function.
     */
    function cs_init() {
      // Get the mozMobileConnection instace for this ICC card.
      _mobileConnection = _mobileConnections[
        DsdsSettings.getIccCardIndexForCallSettings()
      ];
      if (!_mobileConnection) {
        return;
      }

      _voiceServiceClassMask = _mobileConnection.ICC_SERVICE_CLASS_VOICE;
      _taskScheduler = TaskScheduler();

      // Set the navigation correctly when on a multi ICC card device.
      if (DsdsSettings.getNumberOfIccSlots() > 1) {
        var callSettingsPanel = document.getElementById('call');
        var header = callSettingsPanel.querySelector('gaia-header');
        header.setAttribute('data-href', '#call-iccs');
      }

      cs_addVoiceTypeChangeListeners();
      cs_updateNetworkTypeLimitedItemsVisibility(
        _mobileConnection.voice && _mobileConnection.voice.type);

      cs_initVoiceMailClickEvent();

      // Init call setting stuff.
      cs_initVoiceMailSettings();
      cs_initVoicePrivacyMode();
      cs_initCallWaiting();
      cs_initCallerId();
      cs_initFdnItem();
      cs_initTtyMode();
      window.setTimeout(cs_initCallForwardingObservers, 500);

      // Update items in the call settings panel.
      window.addEventListener('panelready', function(e) {
        // Get the mozMobileConnection instace for this ICC card.
        _mobileConnection = _mobileConnections[
          DsdsSettings.getIccCardIndexForCallSettings()
        ];
        if (!_mobileConnection) {
          return;
        }

        switch (e.detail.current) {
          case '#call':
            // No need to refresh the call settings items if navigated from
            // panels not manipulating call settings.
            if (e.detail.previous === '#call-cfSettings' ||
                e.detail.previous === '#call-cbSettings' ||
                e.detail.previous === '#call-voiceMailSettings') {
              return;
            }
            cs_updateNetworkTypeLimitedItemsVisibility(
              _mobileConnection.voice && _mobileConnection.voice.type);
            cs_refreshCallSettingItems();
            break;
          case '#call-cfSettings':
            // No need to refresh the call forwarding general settings
            // if navigated from panels not manipulating them.
            if (e.detail.previous.startsWith('#call-cf-')) {
              return;
            }
            cs_updateCallForwardingSubpanels();
            break;
        }
      });

      // We need to refresh call setting items as they can be changed in dialer.
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          return;
        }

        switch (Settings.currentPanel) {
          case '#call':
            cs_updateNetworkTypeLimitedItemsVisibility(
              _mobileConnection.voice && _mobileConnection.voice.type
            );
            cs_refreshCallSettingItems();
            break;
          case '#call-cfSettings':
            cs_updateCallForwardingSubpanels();
            break;
        }
      });

      // Refresh on init
      cs_refreshCallSettingItems();
    }

    function cs_initFdnItem() {
      var iccObj = getIccByIndex();
      var fdnMenuItem = document.getElementById('menuItem-callFdn');
      iccObj.getServiceState('fdn').then(function(hasFdn) {
        fdnMenuItem.hidden = !hasFdn;
      });
    }

    function cs_initTtyMode() {
      var currentTtyValue = _telephony.getTtyMode();
      var ttyInput = document.getElementById('ril-ttyMode');
      ttyInput.value = getTtyValue(currentTtyValue);
      ttyInput.addEventListener('blur', function(event) {
        var ttyValue = _ttyModeConstantsMapping[ttyInput.value];
        _telephony.setTtyMode(ttyValue);
      });
    }

    function getTtyValue(currentTtyValue) {
      var value = '';
      switch (currentTtyValue) {
        case 1:
          value = 'TTY_MODE_FULL';
          break;
        case 2:
          value = 'TTY_MODE_HCO';
          break;
        case 3:
          value = 'TTY_MODE_VCO';
          break;
        case 0:
        default:
          value = 'TTY_MODE_OFF';
          break;
      }
      return value;
    }
    /**
     * Add listeners on 'voicechange' for show/hide network type limited items.
     */
    function cs_addVoiceTypeChangeListeners() {
      Array.prototype.forEach.call(_mobileConnections, function(conn, index) {
        _voiceTypes[index] = conn.voice.type;
        conn.addEventListener('voicechange', function() {
          var newType = conn.voice.type;
          if (index !== DsdsSettings.getIccCardIndexForCallSettings() ||
              _voiceTypes[index] === newType) {
            return;
          }
          _voiceTypes[index] = newType;
          cs_updateNetworkTypeLimitedItemsVisibility(newType);
          cs_refreshCallSettingItems();
        });
      });
    }

    /**
     * Update the network type limited items' visibility based on the
     * voice type.
     */
    function cs_updateNetworkTypeLimitedItemsVisibility(voiceType) {
      var callVoiceMailItem = document.getElementById('menuItem-voice-mail');
      // The following features are limited to GSM types.
      var callForwardingItem =
        document.getElementById('menuItem-callForwarding');
      var callBarringItem =
        document.getElementById('menuItem-callBarring');

      var callWaitingItem = document.getElementById('menuItem-callWaiting');
      var callerIdItem = document.getElementById('menuItem-callerId');
      // The following feature is limited to CDMA types.
      var voicePrivacyItem =
        document.getElementById('menuItem-voicePrivacyMode');

      callForwardingItem.hidden =
      callBarringItem.hidden =
      callWaitingItem.hidden =
      callerIdItem.hidden =
        (_networkTypeCategory[voiceType] !== 'gsm');

      voicePrivacyItem.hidden =
        (_networkTypeCategory[voiceType] !== 'cdma');
    }

    /**
     * Refresh the items in the call setting panel.
     */
    function cs_refreshCallSettingItems() {
      cs_updateVoiceMailItemState();
      cs_updateFdnStatus();
      cs_updateVoicePrivacyItemState();

      cs_updateCallerIdPreference();
      cs_updateCallerIdItemState();
      cs_updateCallWaitingItemState();
    }

    /**
     * Helper function. Check whether the phone number is valid or not.
     *
     * @param {String} number The phone number to check.
     *
     * @return {Boolean} Result.
     */
    function cs_isPhoneNumberValid(number) {
      if (number) {
        var re = /^([\+]*[0-9])+$/;
        if (re.test(number)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Helper function. Stores settings into the database.
     */
    function cs_setToSettingsDB(settingKey, value, callback) {
      var done = function done() {
        if (callback) {
          callback();
        }
      };

      var getLock = _settings.createLock();
      var request = getLock.get(settingKey);
      request.onsuccess = function getFromDBSuccess() {
        var currentValue = request.result[settingKey];
        if (currentValue !== value) {
          var setLock = _settings.createLock();
          var cset = {};
          cset[settingKey] = value;
          var setRequest = setLock.set(cset);
          setRequest.onsuccess = done;
          setRequest.onerror = done;
        } else {
          done();
        }
      };
      request.onerror = done;
    }

    /**
     * Helper function. Displays rule info.
     */
    function cs_displayRule(rules, elementId) {
      var element = document.getElementById(elementId);

      element.innerHTML = '';
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].active &&
            ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
          navigator.mozL10n.setAttributes(element,
            'callForwardingForwardingVoiceToNumber',
            { number: rules[i].number });
          return;
        }
      }

      element.setAttribute('data-l10n-id', 'callForwardingNotForwarding');
    }

    /**
     * Helper function. Enables/disables tapping on call forwarding entry.
     */
    function cs_enableTapOnCallForwardingItems(enable) {
      // First, update 'Call Settings' menu item
      var menuItem = document.getElementById('menuItem-callForwarding');
      if (enable) {
        menuItem.removeAttribute('aria-disabled');
      } else {
        menuItem.setAttribute('aria-disabled', true);
      }

      // After that, update 'Call Forwarding' submenu items
      var elementIds = ['li-cfu-desc',
                        'li-cfmb-desc',
                        'li-cfnrep-desc',
                        'li-cfnrea-desc'];
      var isUnconditionalCFOn = (_cfReasonStates[0] === 1);

      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        if (!element) {
          return;
        }

        if (enable) {
          element.removeAttribute('aria-disabled');
          // If unconditional call forwarding is on we keep disabled the other
          // panels.
          if (isUnconditionalCFOn && id !== 'li-cfu-desc') {
            element.setAttribute('aria-disabled', true);
          }
        } else {
          element.setAttribute('aria-disabled', true);
        }
      });
    }

    /**
     * Display information relevant to the SIM card state.
     */
    function cs_displayInfoForAll(l10nId) {
      var cfuDesc = document.getElementById('cfu-desc');
      var cfmbDesc = document.getElementById('cfmb-desc');
      var cfnrepDesc = document.getElementById('cfnrep-desc');
      var cfnreaDesc = document.getElementById('cfnrea-desc');

      cfuDesc.innerHTML = '';
      cfmbDesc.innerHTML = '';
      cfnrepDesc.innerHTML = '';
      cfnreaDesc.innerHTML = '';

      cfuDesc.setAttribute('data-l10n-id', l10nId);
      cfmbDesc.setAttribute('data-l10n-id', l10nId);
      cfnrepDesc.setAttribute('data-l10n-id', l10nId);
      cfnreaDesc.setAttribute('data-l10n-id', l10nId);
    }

    /**
     * Gets current call forwarding rules.
     */
    function cs_getCallForwardingOption(callback) {
      var onerror = function call_getCWOptionError() {
        if (callback) {
          _ignoreSettingChanges = false;
          callback(null);
        }
      };

      // Queries rules for unconditional call forwarding.
      var unconditional = _mobileConnection.getCallForwardingOption(
        _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL);

      unconditional.onsuccess = function() {
        var unconditionalRules = unconditional.result;

        // Queries rules for call forwarding when device busy.
        var mobileBusy = _mobileConnection.getCallForwardingOption(
          _cfReason.CALL_FORWARD_REASON_MOBILE_BUSY);

        mobileBusy.onsuccess = function() {
          var mobileBusyRules = mobileBusy.result;

          // Queries rules for call forwarding when device does not reply.
          var noReply = _mobileConnection.getCallForwardingOption(
            _cfReason.CALL_FORWARD_REASON_NO_REPLY);

          noReply.onsuccess = function() {
            var noReplyRules = noReply.result;

            // Queries rules for call forwarding when device is not reachable.
            var notReachable = _mobileConnection.getCallForwardingOption(
              _cfReason.CALL_FORWARD_REASON_NOT_REACHABLE);

            notReachable.onsuccess = function() {
              var notReachableRules = notReachable.result;

              var cfOptions = {
                'unconditional': unconditionalRules,
                'mobilebusy': mobileBusyRules,
                'noreply': noReplyRules,
                'notreachable': notReachableRules
              };

              // Waits for all DB settings completed.
              var asyncOpChecker = {
                taskCount: 0,
                runTask: function(func) {
                  this.taskCount++;
                  var newArgs = [];
                  for (var i = 1; i < arguments.length; i++) {
                    newArgs.push(arguments[i]);
                  }
                  newArgs.push(this.complete.bind(this));
                  func.apply(window, newArgs);
                },
                complete: function() {
                  this.taskCount--;
                  if (this.taskCount === 0) {
                    this.finish();
                  }
                },
                finish: function() {
                  setTimeout(function() {
                    _ignoreSettingChanges = false;
                    callback(cfOptions);
                  }, 500);
                }
              };

              // While storing the settings into the database we avoid observing
              // changes on those ones and enabling/disabling call forwarding.
              _ignoreSettingChanges = true;
              // Ensures the settings being set to the setting DB.
              Object.keys(cfOptions).forEach(function(settingKey) {
                var rules = cfOptions[settingKey];
                var hasValidRule = false;
                for (var i = 0; i < rules.length; i++) {
                  if (rules[i].active &&
                    ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
                    _cfReasonStates[_cfReasonMapping[settingKey]] = 1;
                    asyncOpChecker.runTask(
                      cs_setToSettingsDB,
                      'ril.cf.' + settingKey + '.number',
                      rules[i].number
                    );
                    asyncOpChecker.runTask(
                      cs_setToSettingsDB,
                      'ril.cf.' + settingKey + '.enabled',
                      true
                    );
                    if (settingKey === 'unconditional') {
                      // Send the latest query result from carrier to system app
                      asyncOpChecker.runTask(
                        cs_setToSettingsDB,
                        'ril.cf.carrier.enabled',
                        {
                          enabled: true,
                          index: DsdsSettings.getIccCardIndexForCallSettings()
                        }
                      );
                    }
                    hasValidRule = true;
                    break;
                  }
                }

                if (!hasValidRule) {
                  _cfReasonStates[_cfReasonMapping[settingKey]] = 0;
                  // Send the latest query result from carrier to system app
                  asyncOpChecker.runTask(
                    cs_setToSettingsDB,
                    'ril.cf.' + settingKey + '.number',
                    ''
                  );
                  asyncOpChecker.runTask(
                    cs_setToSettingsDB,
                    'ril.cf.' + settingKey + '.enabled',
                    false
                  );
                  if (settingKey === 'unconditional') {
                    asyncOpChecker.runTask(
                      cs_setToSettingsDB,
                      'ril.cf.carrier.enabled',
                      {
                        enabled: false,
                        index: DsdsSettings.getIccCardIndexForCallSettings()
                      }
                    );
                  }
                }
              });
            };
            notReachable.onerror = onerror;
          };
          noReply.onerror = onerror;
        };
        mobileBusy.onerror = onerror;
      };
      unconditional.onerror = onerror;
    }

    /**
     *
     */
    function cs_initCallForwardingObservers() {
      var settingKeys = ['unconditional',
                         'mobilebusy',
                         'noreply',
                         'notreachable'];
      settingKeys.forEach(function(key) {
        _settings.addObserver('ril.cf.' + key + '.enabled', function(event) {
          // While storing the settings into the database we avoid observing
          // changes on those ones and enabling/disabling call forwarding.
          if (_ignoreSettingChanges) {
            return;
          }
          // Bails out in case the reason is already enabled/disabled.
          if (_cfReasonStates[_cfReasonMapping[key]] === event.settingValue) {
            return;
          }
          var selector = 'input[data-setting="ril.cf.' + key + '.number"]';
          var textInput = document.querySelector(selector);
          var mozMobileCFInfo = {};

          mozMobileCFInfo['action'] = event.settingValue ?
            _cfAction.CALL_FORWARD_ACTION_REGISTRATION :
            _cfAction.CALL_FORWARD_ACTION_DISABLE;
          mozMobileCFInfo['reason'] = _cfReasonMapping[key];
          mozMobileCFInfo['serviceClass'] = _voiceServiceClassMask;

          // Skip the phone number checking when disabling call forwarding.
          if (event.settingValue && !cs_isPhoneNumberValid(textInput.value)) {
            DialogService.alert('callForwardingInvalidNumberError', {
              title: 'callForwardingConfirmTitle',
              submitButton: 'continue'
            });

            cs_enableTapOnCallerIdItem(false);
            cs_enableTapOnCallWaitingItem(false);
            cs_enableTapOnCallBarringItem(false);
            cs_enableTapOnCallForwardingItems(false);
            cs_updateCallForwardingSubpanels();
            return;
          }
          mozMobileCFInfo['number'] = textInput.value;
          mozMobileCFInfo['timeSeconds'] =
            mozMobileCFInfo['reason'] !=
              _cfReason.CALL_FORWARD_REASON_NO_REPLY ? 0 : 20;

          var req = _mobileConnection.setCallForwardingOption(mozMobileCFInfo);

          cs_enableTapOnCallerIdItem(false);
          cs_enableTapOnCallWaitingItem(false);
          cs_enableTapOnCallBarringItem(false);
          cs_enableTapOnCallForwardingItems(false);
          cs_displayInfoForAll('callSettingsQuery');

          req.onsuccess = function() {
            cs_updateCallForwardingSubpanels(null,
                                             true,
                                             key,
                                             mozMobileCFInfo['action']);
          };
          req.onerror = function() {
            DialogService.alert('callForwardingSetError', {
              title: 'callForwardingConfirmTitle',
              submitButton: 'continue'
            });
            cs_updateCallForwardingSubpanels();
          };
        });
      });
    }

    /**
     * Get the l10nId to show after setting up call forwarding.
     */
    function cs_getSetCallForwardingOptionResult(rules, action) {
      var l10nId;
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].active &&
            ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
          var disableAction = action === _cfAction.CALL_FORWARD_ACTION_DISABLE;
          l10nId = disableAction ?
            'callForwardingSetForbidden' : 'callForwardingSetSuccess';
          return l10nId;
        }
      }
      var registrationAction =
        action === _cfAction.CALL_FORWARD_ACTION_REGISTRATION;
      l10nId = registrationAction ?
        'callForwardingSetError' : 'callForwardingSetSuccess';
      return l10nId;
    }

    /**
     * Update call forwarding related subpanels.
     */
    function cs_updateCallForwardingSubpanels(callback,
                                              checkSetCallForwardingOptionResult,
                                              reason,
                                              action) {
      var element = document.getElementById('list-callForwarding');
      if (!element || element.hidden) {
        if (typeof callback === 'function') {
          callback(null);
        }
        return;
      }

      _taskScheduler.enqueue('CALL_FORWARDING', function(done) {
        cs_displayInfoForAll('callSettingsQuery');
        cs_enableTapOnCallForwardingItems(false);
        cs_getCallForwardingOption(function got_cfOption(cfOptions) {
          if (cfOptions) {
            // Need to check wether we enabled/disabled forwarding calls
            // properly e.g. the carrier might not support disabling call
            // forwarding for some reasons such as phone is busy, unreachable,
            // etc.
            if (checkSetCallForwardingOptionResult) {
              var rules = cfOptions[reason];
              var messageL10nId =
                cs_getSetCallForwardingOptionResult(rules, action);
              DialogService.alert(messageL10nId, {
                title: 'callForwardingConfirmTitle',
                submitButton: 'continue'
              });
            }
            cs_displayRule(cfOptions['unconditional'], 'cfu-desc');
            cs_displayRule(cfOptions['mobilebusy'], 'cfmb-desc');
            cs_displayRule(cfOptions['noreply'], 'cfnrep-desc');
            cs_displayRule(cfOptions['notreachable'], 'cfnrea-desc');
            _getCallForwardingOptionSuccess = true;
            cs_enableTapOnCallerIdItem(true);
            cs_enableTapOnCallWaitingItem(true);
            cs_enableTapOnCallBarringItem(true);
            //  If the query is a success enable call forwarding items.
            cs_enableTapOnCallForwardingItems(_getCallForwardingOptionSuccess);
          } else {
            cs_displayInfoForAll('callSettingsQueryError');
            _getCallForwardingOptionSuccess = false;
            cs_enableTapOnCallerIdItem(true);
            cs_enableTapOnCallBarringItem(true);
            cs_enableTapOnCallWaitingItem(true);
            //  If the query is an error disable call forwarding items.
            cs_enableTapOnCallForwardingItems(_getCallForwardingOptionSuccess);
          }
          if (callback) {
            callback(null);
          }
          done();
        });
      });
    }

    /**
     *
     */
    function cs_enableTapOnCallerIdItem(enable) {
      var element = document.getElementById('menuItem-callerId');
      if (enable) {
        element.removeAttribute('aria-disabled');
      } else {
        element.setAttribute('aria-disabled', true);
      }
    }

    function cs_updateCallerIdPreference(callback) {
      _taskScheduler.enqueue('CALLER_ID_PREF', function(done) {
        if (typeof callback !== 'function') {
          callback = function() {
            done();
          };
        } else {
          var originalCallback = callback;
          callback = function() {
            originalCallback();
            done();
          };
        }

        cs_enableTapOnCallerIdItem(false);
        cs_enableTapOnCallWaitingItem(false);
        cs_enableTapOnCallBarringItem(false);
        cs_enableTapOnCallForwardingItems(false);

        var req = _mobileConnection.getCallingLineIdRestriction();
        req.onsuccess = function() {
          var value = 0; //CLIR_DEFAULT

          // In some legitimates error cases (FdnCheckFailure), the req.result
          // is undefined. This is fine, we want this, and in this case we will
          // just display an error message for all the matching requests.
          if (req.result) {
            switch (req.result['m']) {
              case 1: // Permanently provisioned
              case 3: // Temporary presentation disallowed
              case 4: // Temporary presentation allowed
                switch (req.result['n']) {
                  case 1: // CLIR invoked, CLIR_INVOCATION
                  case 2: // CLIR suppressed, CLIR_SUPPRESSION
                  case 0: // Network default, CLIR_DEFAULT
                    value = req.result['n']; //'CLIR_INVOCATION'
                    break;
                  default:
                    value = 0; //CLIR_DEFAULT
                    break;
                }
                break;
              case 0: // Not Provisioned
              case 2: // Unknown (network error, etc)
              default:
                value = 0; //CLIR_DEFAULT
                break;
            }

            SettingsCache.getSettings(function(results) {
              var preferences = results['ril.clirMode'] || [0, 0];
              var targetIndex = DsdsSettings.getIccCardIndexForCallSettings();
              preferences[targetIndex] = value;
              var setReq = _settings.createLock().set({
                'ril.clirMode': preferences
              });
              setReq.onsuccess = callback;
              setReq.onerror = callback;
            });
          } else {
            callback();
          }
        };
        req.onerror = callback;
      });
    }

    /**
     *
     */
    function cs_updateCallerIdItemState(callback) {
      var element = document.getElementById('menuItem-callerId');
      if (!element || element.hidden) {
        if (typeof callback === 'function') {
          callback(null);
        }
        return;
      }

      _taskScheduler.enqueue('CALLER_ID', function(done) {
        cs_enableTapOnCallerIdItem(false);
        cs_enableTapOnCallWaitingItem(false);
        cs_enableTapOnCallBarringItem(false);
        cs_enableTapOnCallForwardingItems(false);

        SettingsCache.getSettings(function(results) {
          var targetIndex = DsdsSettings.getIccCardIndexForCallSettings();
          var preferences = results['ril.clirMode'];
          var preference = (preferences && preferences[targetIndex]) || 0;
          var input = document.getElementById('ril-callerId');

          var value;
          switch (preference) {
            case 1: // CLIR invoked
              value = 'CLIR_INVOCATION';
              break;
            case 2: // CLIR suppressed
              value = 'CLIR_SUPPRESSION';
              break;
            case 0: // Network default
            default:
              value = 'CLIR_DEFAULT';
              break;
          }

          input.value = value;

          if (typeof callback === 'function') {
            callback();
          }
          done();
        });
      });
    }

    /**
     *
     */
    function cs_initCallerId() {
      var element = document.getElementById('ril-callerId');

      var updateItem = function() {
        cs_updateCallerIdItemState(function() {
          cs_enableTapOnCallerIdItem(true);
          cs_enableTapOnCallWaitingItem(true);
          cs_enableTapOnCallBarringItem(true);
          cs_enableTapOnCallForwardingItems(true);
        });
      };

      var updatePreferenceAndItem =
        cs_updateCallerIdPreference.bind(null, updateItem);

      // We listen for blur events so that way we set the CLIR mode once the
      // user clicks on the OK button.
      element.addEventListener('blur', function(event) {
        var clirMode = _clirConstantsMapping[element.value];
        var setReq = _mobileConnection.setCallingLineIdRestriction(clirMode);
        // If the setting success, system app will sync the value.
        // If the setting fails, we force sync the value here and update the UI.
        setReq.onerror = updatePreferenceAndItem;
      });

      // As system app will sync the value 'ril.clirMode' with the carrier,
      // the UI update will be triggered by updateItem.
      navigator.mozSettings.addObserver('ril.clirMode', updateItem);
    }

    /**
     *
     */
    function cs_callWaitingItemListener() {
      var alertPanel = document.querySelector('#call .cw-alert');
      var confirmInput =
        alertPanel.querySelector('.cw-alert-checkbox-label input');

      confirmInput.checked = false;
      alertPanel.hidden = false;
    }

    /**
     *
     */
    function cs_enableTapOnCallWaitingItem(enable) {
      var input =
        document.querySelector('#menuItem-callWaiting .checkbox-label input');
      var menuItem = document.getElementById('menuItem-callWaiting');
      var alertLabel =
        document.querySelector('#menuItem-callWaiting .alert-label');

      input.disabled = !enable;
      if (enable) {
        menuItem.removeAttribute('aria-disabled');
        alertLabel.addEventListener('click', cs_callWaitingItemListener);
      } else {
        menuItem.setAttribute('aria-disabled', true);
        alertLabel.removeEventListener('click', cs_callWaitingItemListener);
      }
    }

    /**
     *
     */
    function cs_updateCallWaitingItemState(callback) {
      var menuItem = document.getElementById('menuItem-callWaiting');
      if (!menuItem || menuItem.hidden) {
        if (typeof callback === 'function') {
          callback(null);
        }
        return;
      }

      _taskScheduler.enqueue('CALL_WAITING', function(done) {
        var input = menuItem.querySelector('.checkbox-label input');

        var getCWEnabled = _mobileConnection.getCallWaitingOption();
        getCWEnabled.onsuccess = function cs_getCWEnabledSuccess() {
          var enabled = getCWEnabled.result;
          input.checked = enabled;
          if (enabled) {
            menuItem.dataset.state = 'on';
          } else {
            menuItem.dataset.state = 'off';
          }
          if (callback) {
            callback(null);
          }
          done();
        };
        getCWEnabled.onerror = function cs_getCWEnabledError() {
          menuItem.dataset.state = 'unknown';
          if (callback) {
            callback(null);
          }
          done();
        };
      });
    }

    function cs_enableTapOnCallBarringItem(enable) {
      var element = document.getElementById('menuItem-callBarring');
      if (enable) {
        element.removeAttribute('aria-disabled');
      } else {
        element.setAttribute('aria-disabled', true);
      }
    }

    /**
     *
     */
    function cs_initCallWaiting() {
      var alertPanel =
        document.querySelector('#call .cw-alert');
      var alertLabel =
        document.querySelector('#menuItem-callWaiting .alert-label');
      var setBtn = alertPanel.querySelector('.cw-alert-set');
      var cancelBtn = alertPanel.querySelector('.cw-alert-cancel');

      alertLabel.addEventListener('click', cs_callWaitingItemListener);

      setBtn.addEventListener('click', function cs_alertSetClicked(event) {
        var handleSetCallWaiting = function cs_handleSetCallWaiting() {
          cs_updateCallWaitingItemState(function() {
            cs_enableTapOnCallerIdItem(true);
            cs_enableTapOnCallWaitingItem(true);
            cs_enableTapOnCallBarringItem(true);
            // Keep the state of call forwarding items.
            cs_enableTapOnCallForwardingItems(_getCallForwardingOptionSuccess);
          });
          alertPanel.hidden = true;
        };
        cs_enableTapOnCallerIdItem(false);
        cs_enableTapOnCallWaitingItem(false);
        cs_enableTapOnCallBarringItem(false);
        cs_enableTapOnCallForwardingItems(false);
        var confirmInput =
          alertPanel.querySelector('.cw-alert-checkbox-label input');
        var req = _mobileConnection.setCallWaitingOption(confirmInput.checked);
        req.onsuccess = req.onerror = handleSetCallWaiting;
      });

      cancelBtn.addEventListener('click',
        function cs_alertCancelClicked(event) {
        alertPanel.hidden = true;
      });

      // Bind call waiting setting to the input
      var input =
        document.querySelector('#menuItem-callWaiting .checkbox-label input');
      input.addEventListener('change', function cs_cwInputChanged(event) {
        var handleSetCallWaiting = function cs_handleSetCallWaiting() {
          cs_updateCallWaitingItemState(function() {
            cs_enableTapOnCallerIdItem(true);
            cs_enableTapOnCallWaitingItem(true);
            cs_enableTapOnCallBarringItem(true);
            // Keep the state of call forwarding items.
            cs_enableTapOnCallForwardingItems(_getCallForwardingOptionSuccess);
          });
        };
        cs_enableTapOnCallerIdItem(false);
        cs_enableTapOnCallWaitingItem(false);
        cs_enableTapOnCallBarringItem(false);
        cs_enableTapOnCallForwardingItems(false);
        var req = _mobileConnection.setCallWaitingOption(input.checked);
        req.onsuccess = req.onerror = handleSetCallWaiting;
      });
    }

    /**
     *
     */
    function cs_updateVoiceMailItemState() {
      var voiceMailMenuItem = document.getElementById('voiceMail-desc');
      var targetIndex = DsdsSettings.getIccCardIndexForCallSettings();

      voiceMailMenuItem.textContent = '';
      SettingsCache.getSettings(function(results) {
        var numbers = results['ril.iccInfo.mbdn'];
        var number = numbers[targetIndex];
        if (number) {
          voiceMailMenuItem.removeAttribute('data-l10n-id');
          voiceMailMenuItem.textContent = number;
        } else {
          voiceMailMenuItem.setAttribute('data-l10n-id',
                                         'voiceMail-number-notSet');
        }
      });
    }

    _getVoicemailNumber: function() {
      var self = this;
      var promise = new Promise(function(resolve) {
        SettingsCache.getSettings(function(results) {
          var numbers = results['ril.iccInfo.mbdn'];
          var number = numbers && numbers[self._currentSimIndex];
          resolve(number || '');
        });
      });
      return promise;
    }

    function cs_initVoiceMailClickEvent() {
      var voicemailPanel = document.querySelector('#call .voice-mail');
      var inputfield = document.querySelector('#call .vm-number');
      var setButton = alertPanel.querySelector('.cw-voice-mail-set ');
      var cancelButton = alertPanel.querySelector('.cw-voice-mail-set-cancel');
      document.querySelector('.menuItem-voicemail').onclick = function() {
        var _currentSimIndex =
          window.DsdsSettings.getIccCardIndexForCallSettings();
        var number = _getVoicemailNumber();
        inputfield.value = number;
        var cursorPos = inputfield.value.length;
        inputfield.focus();
        inputfield.setSelectionRange(0, cursorPos);
        setButton.addEventListener('click', function cs_alertSetClicked(event) {
          SettingsCache.getSettings(function(results) {
            var numbers = results['ril.iccInfo.mbdn'] || [];
            numbers[_currentSimIndex] = inputfield.value;
            navigator.mozSettings.createLock().set({
              'ril.iccInfo.mbdn': numbers
            });
          });
          voicemailPanel.hidden = false;
        });
        cancelButton.addEventListener('click',
          function cs_alertCancelClicked(event) {
            voicemailPanel.hidden = true;
          });
        voicemailPanel.hidden = false;
      };
    }

    /**
     *
     */
    function cs_initVoiceMailSettings() {
      // update all voice numbers if necessary
      SettingsCache.getSettings(function(results) {
        var settings = navigator.mozSettings;
        var voicemail = navigator.mozVoicemail;
        var updateVMNumber = false;
        var numbers = results['ril.iccInfo.mbdn'] || [];

        Array.prototype.forEach.call(_mobileConnections, function(conn, index) {
          var number = numbers[index];
          // If the voicemail number has not been stored into the database yet
          // we check whether the number is provided by the mozVoicemail API. In
          // that case we store it into the setting database.
          if (!number && voicemail) {
            number = voicemail.getNumber(index);
            if (number) {
              updateVMNumber = true;
              numbers[index] = number;
            }
          }
        });

        if (updateVMNumber) {
          var req = settings.createLock().set({
            'ril.iccInfo.mbdn': numbers
          });
          req.onsuccess = function() {
            cs_updateVoiceMailItemState();
            settings.addObserver('ril.iccInfo.mbdn', function() {
              cs_updateVoiceMailItemState();
            });
          };
        } else {
          cs_updateVoiceMailItemState();
          settings.addObserver('ril.iccInfo.mbdn', function() {
            cs_updateVoiceMailItemState();
          });
        }
      });
    }

    function cs_updateVoicePrivacyItemState() {
      var menuItem = document.getElementById('menuItem-voicePrivacyMode');
      if (!menuItem || menuItem.hidden) {
        return;
      }

      var privacyModeItem =
          document.getElementById('menuItem-voicePrivacyMode');
      var privacyModeInput =
        privacyModeItem.querySelector('input');

      var getReq = _mobileConnection.getVoicePrivacyMode();
      getReq.onsuccess = function get_vpm_success() {
        privacyModeInput.checked = getReq.result;
      };
      getReq.onerror = function get_vpm_error() {
        console.warn('get voice privacy mode: ' + getReq.error.name);
      };
    }

    /**
     * Init voice privacy mode.
     */
    function cs_initVoicePrivacyMode() {
      var defaultVoicePrivacySettings =
        Array.prototype.map.call(_mobileConnections,
          function() { return false; });
      var voicePrivacyHelper =
        SettingsHelper('ril.voicePrivacy.enabled', defaultVoicePrivacySettings);

      var privacyModeItem =
        document.getElementById('menuItem-voicePrivacyMode');
      var privacyModeInput =
        privacyModeItem.querySelector('input');

      privacyModeInput.addEventListener('change',
        function vpm_inputChanged() {
          var checked = this.checked;
          voicePrivacyHelper.get(function gotVP(values) {
            var originalValue = !checked;
            var setReq = _mobileConnection.setVoicePrivacyMode(checked);
            setReq.onsuccess = function set_vpm_success() {
              var targetIndex = DsdsSettings.getIccCardIndexForCallSettings();
              values[targetIndex] = !originalValue;
              voicePrivacyHelper.set(values);
            };
            setReq.onerror = function get_vpm_error() {
              // restore the value if failed.
              privacyModeInput.checked = originalValue;
            };
          });
      });
    }

    /**
     *
     */
    function cs_updateFdnStatus() {
      var iccObj = getIccByIndex();
      if (!iccObj) {
        return;
      }

      var req = iccObj.getCardLock('fdn');
      req.onsuccess = function spl_checkSuccess() {
        var enabled = req.result.enabled;

        var simFdnDesc = document.querySelector('#fdnSettings-desc');
        simFdnDesc.setAttribute('data-l10n-id',
                                enabled ? 'enabled' : 'disabled');

        var fdnSettingsBlocked = document.querySelector('#fdnSettingsBlocked');
        if (fdnSettingsBlocked) {
          fdnSettingsBlocked.hidden = !enabled;
        }
        var callForwardingItem =
          document.getElementById('menuItem-callForwarding');
        callForwardingItem.hidden = enabled;
      };
    }

    return {
      init: cs_init
    };
  })(this, document);

  /**
   * TaskScheduler helps manage tasks and ensures they are executed in
   * sequential order. When a task of a certain type is enqueued, all pending
   * tasks of the same type in the queue are removed. This avoids redundant
   * queries and improves user perceived performance.
   */
  var TaskScheduler = function() {
    return {
      _isLocked: false,
      _tasks: [],
      _lock: function() {
        this._isLocked = true;
      },
      _unlock: function() {
        this._isLocked = false;
        this._executeNextTask();
      },
      _removeRedundantTasks: function(type) {
        return this._tasks.filter(function(task) {
          return task.type !== type;
        });
      },
      _executeNextTask: function() {
        if (this._isLocked) {
          return;
        }
        var nextTask = this._tasks.shift();
        if (nextTask) {
          this._lock();
          nextTask.func(function() {
            this._unlock();
          }.bind(this));
        }
      },
      enqueue: function(type, func) {
        this._tasks = this._removeRedundantTasks(type);
        this._tasks.push({
          type: type,
          func: func
        });
        this._executeNextTask();
      }
    };
  };

  /**
   * Startup.
   */
  navigator.mozL10n.once(function loadWhenIdle() {
    var idleObserver = {
      time: 3,
      onidle: function() {
        CallSettings.init();
        navigator.removeIdleObserver(idleObserver);
      }
    };
    navigator.addIdleObserver(idleObserver);
  });
}.bind(null, this));
