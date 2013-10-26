/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Handle call settings.
var Calls = (function(window, document, undefined) {
  var _ = navigator.mozL10n.get;

  // Must be in sync with nsIDOMMozMobileCFInfo interface.
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

  var mobileConnection = getMobileConnection();
  var settings = window.navigator.mozSettings;
  var _voiceServiceClassMask = mobileConnection.ICC_SERVICE_CLASS_VOICE;

  function isPhoneNumberValid(number) {
    if (number) {
      var re = /^([\+]*[0-9])+$/;
      if (re.test(number)) {
        return true;
      }
    }
    return false;
  }

  // Stores settings into the database.
  function setToSettingsDB(settingKey, value, callback) {
    var done = function done() {
      if (callback)
        callback();
    };

    var getLock = settings.createLock();
    var request = getLock.get(settingKey);
    request.onsuccess = function getFromDBSuccess() {
      var currentValue = request.result[settingKey];
      if (currentValue !== value) {
        var setLock = settings.createLock();
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

  // Displays rule info.
  function displayRule(rules, elementId, settingKey) {
    var element = document.getElementById(elementId);
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].active &&
          ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
        element.textContent = _('callForwardingForwardingVoiceTo') +
          ' ' + rules[i].number;
        document.getElementById('cf-' + settingKey + '-number').disabled = true;
        return;
      }
    }

    element.textContent = _('callForwardingNotForwarding');
    element.dataset.l10nId = 'callForwardingNotForwarding';
    document.getElementById('cf-' + settingKey + '-number').disabled = false;
  };

  // Enables/disables tapping on call forwarding entry.
  function enableTapOnCallForwardingItems(enable) {
    var elementIds = ['li-cfu-desc',
                      'li-cfmb-desc',
                      'li-cfnrep-desc',
                      'li-cfnrea-desc'];
    var isUnconditionalCFOn = (_cfReasonStates[0] === 1);

    elementIds.forEach(function(id) {
      var element = document.getElementById(id);
      if (enable) {
        element.removeAttribute('aria-disabled');
        // If unconditional call forwarding is on we keep disabled the other
        // panels.
        if (isUnconditionalCFOn && id !== 'li-cfu-desc') {
          element.setAttribute('aria-disabled', true);
        }
      } else {
        document.getElementById(id).setAttribute('aria-disabled', true);
      }
    });
  };

  // Displays what's happening while requesting call forwarding info.
  function displayInfoForAll(what) {
    document.getElementById('cfu-desc').textContent =
      document.getElementById('cfmb-desc').textContent =
        document.getElementById('cfnrep-desc').textContent =
          document.getElementById('cfnrea-desc').textContent =
            what;
  };

  // Display information relevant to the SIM card state
  function displaySimCardStateInfo() {
    var kSimCardStates = {
      'pinRequired' : _('simCardLockedMsg'),
      'pukRequired' : _('simCardLockedMsg'),
      'networkLocked' : _('simLockedPhone'),
      'corporateLocked' : _('simLockedPhone'),
      'serviceProviderLocked' : _('simLockedPhone'),
      'unknown' : _('unknownSimCardState'),
      'illegal' : _('simCardIllegal'),
      'absent' : _('noSimCard'),
      'null' : _('simCardNotReady')
    };
    var simCardState = kSimCardStates[IccHelper.cardState ?
                                      IccHelper.cardState :
                                      'null'];
    displayInfoForAll(simCardState);
  };

  // Stores current states (enabler or not) of the call forwaring reason.
  var _cfReasonStates = [0, 0, 0, 0];
  var ignoreSettingChanges = false;
  // Gets current call forwarding rules.
  function getCallForwardingOption(callback) {
    var onerror = function call_getCWOptionError() {
      if (callback) {
        ignoreSettingChanges = false;
        callback(null);
      }
    };

    // Queries rules for unconditional call forwarding.
    var unconditional = mobileConnection.getCallForwardingOption(
      _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL);

    unconditional.onsuccess = function() {
      var unconditionalRules = unconditional.result;

      // Queries rules for call forwarding when device busy.
      var mobileBusy = mobileConnection.getCallForwardingOption(
        _cfReason.CALL_FORWARD_REASON_MOBILE_BUSY);

      mobileBusy.onsuccess = function() {
        var mobileBusyRules = mobileBusy.result;

        // Queries rules for call forwarding when device does not reply.
        var noReply = mobileConnection.getCallForwardingOption(
          _cfReason.CALL_FORWARD_REASON_NO_REPLY);

        noReply.onsuccess = function() {
          var noReplyRules = noReply.result;

          // Queries rules for call forwarding when device is not reachable.
          var notReachable = mobileConnection.getCallForwardingOption(
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
                for (var i = 1; i < arguments.length; i++)
                  newArgs.push(arguments[i]);
                newArgs.push(this.complete.bind(this));
                func.apply(window, newArgs);
              },
              complete: function() {
                this.taskCount--;
                if (this.taskCount == 0)
                  this.finish();
              },
              finish: function() {
                setTimeout(function() {
                  ignoreSettingChanges = false;
                  callback(cfOptions);
                }, 500);
              }
            };

            // While storing the settings into the database we avoid observing
            // changes on those ones and enabling/disabling call forwarding.
            ignoreSettingChanges = true;
            // Ensures the settings being set to the setting DB.
            Object.keys(cfOptions).forEach(function(settingKey) {
              var rules = cfOptions[settingKey];
              var hasValidRule = false;
              for (var i = 0; i < rules.length; i++) {
                if (rules[i].active &&
                  ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
                  _cfReasonStates[_cfReasonMapping[settingKey]] = 1;
                  asyncOpChecker.runTask(
                    setToSettingsDB,
                    'ril.cf.' + settingKey + '.number',
                    rules[i].number
                  );
                  asyncOpChecker.runTask(
                    setToSettingsDB,
                    'ril.cf.' + settingKey + '.enabled',
                    true
                  );
                  if (settingKey === 'unconditional') {
                    asyncOpChecker.runTask(
                      setToSettingsDB,
                      'ril.cf.carrier.enabled',
                      true
                    );
                  }
                  hasValidRule = true;
                  break;
                }
              }

              if (!hasValidRule) {
                _cfReasonStates[_cfReasonMapping[settingKey]] = 0;
                asyncOpChecker.runTask(
                  setToSettingsDB,
                  'ril.cf.' + settingKey + '.number',
                  ''
                );
                asyncOpChecker.runTask(
                  setToSettingsDB,
                  'ril.cf.' + settingKey + '.enabled',
                  false
                );
                if (settingKey === 'unconditional') {
                  asyncOpChecker.runTask(
                    setToSettingsDB,
                    'ril.cf.carrier.enabled',
                    false
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
  };

  function initCallForwardingObservers() {
    var settingKeys = ['unconditional',
                       'mobilebusy',
                       'noreply',
                       'notreachable'];
    settingKeys.forEach(function(key) {
      settings.addObserver('ril.cf.' + key + '.enabled', function(event) {
        // While storing the settings into the database we avoid observing
        // changes on those ones and enabling/disabling call forwarding.
        if (ignoreSettingChanges) {
          return;
        }
        // Bails out in case the reason is already enabled/disabled.
        if (_cfReasonStates[_cfReasonMapping[key]] == event.settingValue) {
          return;
        }
        // Bails out in case of airplane mode.
        if (IccHelper.cardState !== 'ready') {
          return;
        }
        var selector = 'input[data-setting="ril.cf.' + key + '.number"]';
        var textInput = document.querySelector(selector);
        var mozMobileCFInfo = {};

        mozMobileCFInfo['action'] = event.settingValue ?
          _cfAction.CALL_FORWARD_ACTION_REGISTRATION :
          _cfAction.CALL_FORWARD_ACTION_DISABLE;
        mozMobileCFInfo['reason'] = _cfReasonMapping[key];
        mozMobileCFInfo['serviceClass'] =
          mobileConnection.ICC_SERVICE_CLASS_VOICE;

        if (!isPhoneNumberValid(textInput.value)) {
          document.getElementById('cf-confirm-message').textContent =
            _('callForwardingInvalidNumberError');
          var cfAlertPanel = document.querySelector('#call .cf-alert');
          cfAlertPanel.hidden = false;
          enableTabOnCallerIdItem(false);
          enableTabOnCallWaitingItem(false);
          enableTapOnCallForwardingItems(false);
          updateCallForwardingSubpanels();
          return;
        }
        mozMobileCFInfo['number'] = textInput.value;
        mozMobileCFInfo['timeSeconds'] =
          mozMobileCFInfo['reason'] !=
            _cfReason.CALL_FORWARD_REASON_NO_REPLY ? 0 : 20;

        var req = mobileConnection.setCallForwardingOption(mozMobileCFInfo);

        enableTabOnCallerIdItem(false);
        enableTabOnCallWaitingItem(false);
        enableTapOnCallForwardingItems(false);
        displayInfoForAll(_('callSettingsQuery'));

        req.onsuccess = function() {
          updateCallForwardingSubpanels(null,
                                        true,
                                        key,
                                        mozMobileCFInfo['action']);
        };
        req.onerror = function() {
          document.getElementById('cf-confirm-message').textContent =
            _('callForwardingSetError');
          var cfAlertPanel = document.querySelector('#call .cf-alert');
          cfAlertPanel.hidden = false;
          updateCallForwardingSubpanels();
        };
      });
    });
  }

  // Get the message to show after setting up call forwarding.
  function getSetCallForwardingOptionResult(rules, action) {
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].active &&
          ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
        var disableAction = action == _cfAction.CALL_FORWARD_ACTION_DISABLE;
        var message = disableAction ?
          _('callForwardingSetForbidden') : _('callForwardingSetSuccess');
        return message;
      }
    }
    var registrationAction =
      action == _cfAction.CALL_FORWARD_ACTION_REGISTRATION;
    var message = registrationAction ?
      _('callForwardingSetError') : _('callForwardingSetSuccess');
    return message;
  };

  var getCallForwardingOptionSuccess = true;
  var updatingInProgress = false;
  function updateCallForwardingSubpanels(callback,
                                         checkSetCallForwardingOptionResult,
                                         reason,
                                         action) {
    updatingInProgress = true;

    displayInfoForAll(_('callSettingsQuery'));
    enableTapOnCallForwardingItems(false);
    getCallForwardingOption(function got_cfOption(cfOptions) {
      if (cfOptions) {
        // Need to check wether we enabled/disabled forwarding calls properly,
        // e.g. the carrier might not support disabling call forwarding for some
        // reasons such as phone is busy, unreachable, etc.
        if (checkSetCallForwardingOptionResult) {
          var rules = cfOptions[reason];
          var message = getSetCallForwardingOptionResult(rules, action);
          document.getElementById('cf-confirm-message').textContent = message;
          var cfAlertPanel = document.querySelector('#call .cf-alert');
          cfAlertPanel.hidden = false;
        }
        displayRule(cfOptions['unconditional'], 'cfu-desc', 'unconditional');
        displayRule(cfOptions['mobilebusy'], 'cfmb-desc', 'mobilebusy');
        displayRule(cfOptions['noreply'], 'cfnrep-desc', 'noreply');
        displayRule(cfOptions['notreachable'], 'cfnrea-desc', 'notreachable');
        getCallForwardingOptionSuccess = true;
        enableTabOnCallerIdItem(true);
        enableTabOnCallWaitingItem(true);
        //  If the query is a success enable call forwarding items.
        enableTapOnCallForwardingItems(getCallForwardingOptionSuccess);
      } else {
        displayInfoForAll(_('callSettingsQueryError'));
        getCallForwardingOptionSuccess = false;
        enableTabOnCallerIdItem(true);
        enableTabOnCallWaitingItem(true);
        //  If the query is an error disable call forwarding items.
        enableTapOnCallForwardingItems(getCallForwardingOptionSuccess);
      }
      updatingInProgress = false;
      if (callback) {
        callback(null);
      }
    });
  }

  function initCallForwarding() {
    displayInfoForAll(_('callSettingsQuery'));
    if (!settings || !mobileConnection || !IccHelper.enabled) {
      displayInfoForAll(_('callSettingsQueryError'));
      return;
    }

    if (IccHelper.cardState != 'ready') {
      displaySimCardStateInfo();
      return;
    }

    // Prevent sub panels from being selected while airplane mode.
    IccHelper.addEventListener('cardstatechange', function() {
      enableTapOnCallForwardingItems(IccHelper.cardState === 'ready');
    });

    // Initialize the call forwarding alert panel.
    var cfAlertPanel = document.querySelector('#call .cf-alert');
    var cfContinueBtn = cfAlertPanel.querySelector('.cf-alert-continue');
    cfContinueBtn.addEventListener('click', function() {
      cfAlertPanel.hidden = true;
    });
  }

  function enableTabOnCallerIdItem(enable) {
    var element = document.getElementById('menuItem-callerId');
    if (enable) {
      element.removeAttribute('aria-disabled');
    } else {
      element.setAttribute('aria-disabled', true);
    }
  }

  function updateCallerIdItemState(callback) {
    enableTabOnCallerIdItem(false);
    enableTabOnCallWaitingItem(false);
    enableTapOnCallForwardingItems(false);

    var req = mobileConnection.getCallingLineIdRestriction();
    req.onsuccess = req.onerror = function(event) {
      var input = document.getElementById('ril-callerId');

      var value = 'CLIR_DEFAULT';

      // In some legitimates error cases (FdnCheckFailure), the req.result is
      // undefined. This is fine, we want this, and in this case we will just
      // display an error message for all the matching requests.
      if (req.result) {
        switch (req.result['m']) {
          case 1: // Permanently provisioned
          case 3: // Temporary presentation disallowed
          case 4: // Temporary presentation allowed
            switch (req.result['n']) {
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
            break;
          case 0: // Not Provisioned
          case 2: // Unknown (network error, etc)
          default:
            value = 'CLIR_DEFAULT';
            break;
        }
      }

      input.value = value;

      if (callback) {
        callback(null);
      }
    };
  }

  function initCallerId() {
    if (!settings || !mobileConnection || !IccHelper.enabled) {
      return;
    }

    if (IccHelper.cardState != 'ready') {
      return;
    }

    // Prevent sub panels from being selected while airplane mode.
    IccHelper.addEventListener('cardstatechange', function() {
      enableTapOnCallerIdItem(IccHelper.cardState === 'ready');
    });

    var element = document.getElementById('ril-callerId');
    // We listen for blur events so that way we set the CLIR mode once the user
    // clicks on the OK button.
    element.addEventListener('blur', function(event) {
      var clirMode = _clirConstantsMapping[element.value];
      var req = mobileConnection.setCallingLineIdRestriction(clirMode);
      req.onsuccess = req.onerror = function() {
        updateCallerIdItemState(function() {
          enableTabOnCallerIdItem(true);
          enableTabOnCallWaitingItem(true);
          enableTapOnCallForwardingItems(true);
        });
      };
    });
  }

  // The UI for cell broadcast indicates that it is enabled or not, whereas
  // the setting used is 'disabled' so note that we switch the value when
  // it is set or displayed
  function initCellBroadcast() {
    var CBS_KEY = 'ril.cellbroadcast.disabled';
    var wrapper = document.getElementById('menuItem-cellBroadcast');
    var input = wrapper.querySelector('input');
    var init = false;

    var cellBroadcastChanged = function(value) {
      input.checked = !value;
      if (!init) {
        input.disabled = false;
        wrapper.removeAttribute('aria-disabled');
        init = true;
      }
    };

    var inputChanged = function(event) {
      var cbsset = {};
      cbsset[CBS_KEY] = !input.checked;
      settings.createLock().set(cbsset);
    };

    input.addEventListener('change', inputChanged);
    SettingsListener.observe(CBS_KEY, false, cellBroadcastChanged);
  }

  var callWaitingItemListener = function(evt) {
    var alertPanel = document.querySelector('#call .cw-alert');
    var confirmInput =
      alertPanel.querySelector('.cw-alert-checkbox-label input');

    confirmInput.checked = false;
    alertPanel.hidden = false;
  };

  function enableTabOnCallWaitingItem(enable) {
    var input =
      document.querySelector('#menuItem-callWaiting .checkbox-label input');
    var menuItem = document.getElementById('menuItem-callWaiting');
    var alertLabel =
      document.querySelector('#menuItem-callWaiting .alert-label');

    input.disabled = !enable;
    if (enable) {
      menuItem.removeAttribute('aria-disabled');
      alertLabel.addEventListener('click', callWaitingItemListener);
    } else {
      menuItem.setAttribute('aria-disabled', true);
      alertLabel.removeEventListener('click', callWaitingItemListener);
    }
  }

  function updateCallWaitingItemState(callback) {
    var menuItem = document.querySelector('#menuItem-callWaiting');
    var input = menuItem.querySelector('.checkbox-label input');

    var getCWEnabled = mobileConnection.getCallWaitingOption();
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
    };
    getCWEnabled.onerror = function cs_getCWEnabledError() {
      menuItem.dataset.state = 'unknown';
      if (callback) {
        callback(null);
      }
    };
  }

  function initCallWaiting() {
    if (!settings || !mobileConnection || !IccHelper.enabled) {
      return;
    }

    if (IccHelper.cardState != 'ready') {
      return;
    }

    // Prevent the item from being changed while airplane mode.
    IccHelper.addEventListener('cardstatechange', function() {
      enableTabOnCallWaitingItem(IccHelper.cardState === 'ready');
    });

    var alertPanel = document.querySelector('#call .cw-alert');
    var alertLabel =
      document.querySelector('#menuItem-callWaiting .alert-label');
    var setBtn = alertPanel.querySelector('.cw-alert-set');
    var cancelBtn = alertPanel.querySelector('.cw-alert-cancel');

    alertLabel.addEventListener('click', callWaitingItemListener);

    setBtn.addEventListener('click', function cs_alertSetClicked(event) {
      var handleSetCallWaiting = function cs_handleSetCallWaiting() {
        updateCallWaitingItemState(function() {
          enableTabOnCallerIdItem(true);
          enableTabOnCallWaitingItem(true);
          // Keep the state of call forwarding items.
          enableTapOnCallForwardingItems(getCallForwardingOptionSuccess);
        });
        alertPanel.hidden = true;
      };
      enableTabOnCallerIdItem(false);
      enableTabOnCallWaitingItem(false);
      enableTapOnCallForwardingItems(false);
      var confirmInput =
        alertPanel.querySelector('.cw-alert-checkbox-label input');
      var req = mobileConnection.setCallWaitingOption(confirmInput.checked);
      req.onsuccess = req.onerror = handleSetCallWaiting;
    });

    cancelBtn.addEventListener('click', function cs_alertCancelClicked(event) {
      alertPanel.hidden = true;
    });

    // Bind call waiting setting to the input
    var input =
      document.querySelector('#menuItem-callWaiting .checkbox-label input');
    input.addEventListener('change', function cs_cwInputChanged(event) {
      var handleSetCallWaiting = function cs_handleSetCallWaiting() {
        updateCallWaitingItemState(function() {
          enableTabOnCallerIdItem(true);
          enableTabOnCallWaitingItem(true);
          // Keep the state of call forwarding items.
          enableTapOnCallForwardingItems(getCallForwardingOptionSuccess);
        });
      };
      enableTabOnCallerIdItem(false);
      enableTabOnCallWaitingItem(false);
      enableTapOnCallForwardingItems(false);
      var req = mobileConnection.setCallWaitingOption(input.checked);
      req.onsuccess = req.onerror = handleSetCallWaiting;
    });
  }

  function updateVoiceMailItemState() {
    var element = document.getElementById('voiceMail-desc');
    if (!element) {
      return;
    }

    var transaction = settings.createLock();
    var request = transaction.get('ril.iccInfo.mbdn');
    request.onsuccess = function() {
       var number = request.result['ril.iccInfo.mbdn'];

       if (number) {
         element.textContent = number;
         return;
       }
       var voicemail = navigator.mozVoicemail;
       if (voicemail && voicemail.number) {
         element.textContent = voicemail.number;
         return;
       }
       element.textContent = _('voiceMail-number-notSet');
    };
    request.onerror = function() {};
  }

  function initVoiceMailSettings() {
    settings.addObserver('ril.iccInfo.mbdn', function(event) {
      updateVoiceMailItemState();
    });
    var transaction = settings.createLock();
    var request = transaction.get('ril.iccInfo.mbdn');
    request.onsuccess = function() {
      var number = request.result['ril.iccInfo.mbdn'];
      var voicemail = navigator.mozVoicemail;
      // If the voicemail number has not been stored into the database yet we
      // check whether the number is provided by the mozVoicemail API. In that
      // case we store it into the setting database.
      if (!number && voicemail && voicemail.number) {
        setToSettingsDB('ril.iccInfo.mbdn', voicemail.number, null);
        return;
      }
      updateVoiceMailItemState();
    };
    request.onerror = function() {};
  }

  function initVoicePrivacyMode() {
    if (!mobileConnection) {
      return;
    }

    // get network type
    getSupportedNetworkInfo(function(result) {
      if (!result.cdma)
        return;

      var privacyModeItem =
        document.getElementById('menuItem-voicePrivacyMode');
      var privacyModeInput =
        privacyModeItem.querySelector('input');

      var getReq = mobileConnection.getVoicePrivacyMode();
      getReq.onsuccess = function get_vpm_success() {
        privacyModeItem.hidden = false;
        privacyModeInput.checked = getReq.result;
      };
      getReq.onerror = function get_vpm_error() {
        console.warn('get voice privacy mode: ' + getReq.error.name);
        if (getReq.error.name === 'RequestNotSupported' ||
            getReq.error.name === 'GenericFailure') {
          privacyModeItem.hidden = true;
        }
      };

      privacyModeInput.addEventListener('change',
        function vpm_inputChanged() {
          var originalValue = !this.checked;
          var setReq = mobileConnection.setVoicePrivacyMode(this.checked);
          setReq.onerror = function get_vpm_error() {
            // restore the value if failed.
            privacyModeInput.checked = originalValue;
          };
      });
    });
  }

  function updateFdnStatus() {
    if (!IccHelper.enabled) {
      return;
    }

    var req = IccHelper.getCardLock('fdn');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;

      var simFdnDesc = document.querySelector('#fdnSettings-desc');
      localize(simFdnDesc, enabled ? 'enabled' : 'disabled');

      var fdnSettingsBlocked = document.querySelector('#fdnSettingsBlocked');
      fdnSettingsBlocked.hidden = !enabled;

      var callForwardingOptions = document.querySelectorAll(
        '#li-cfu-desc, #li-cfmb-desc, #li-cfnrep-desc, #li-cfnrea-desc');
      for (var i = 0, l = callForwardingOptions.length; i < l; i++) {
        callForwardingOptions[i].hidden = enabled;
      }
    };
  }

  // Call subpanel navigation control.
  window.addEventListener('panelready', function(e) {
    // If navigation is from #root to #call panels then update UI always.
    if (e.detail.current !== '#call' ||
        e.detail.previous.startsWith('#call-cf-') ||
        e.detail.previous === '#call-voiceMailSettings') {
      return;
    }

    if (!updatingInProgress) {
      updateVoiceMailItemState();
      updateFdnStatus();
      updateCallerIdItemState(
        function panelready_updateCallerIdItemState() {
          updateCallWaitingItemState(
            function panelready_updateCallWaitingItemState() {
              updateCallForwardingSubpanels();
          });
      });
    }
  });

  // Public API.
  return {
    // Startup.
    init: function calls_init() {
      initVoiceMailSettings();
      initVoicePrivacyMode();
      initCallWaiting();
      initCellBroadcast();
      initCallerId();
      initCallForwarding();

      setTimeout(initCallForwardingObservers, 500);
    }
  };
})(this, document);

// Startup.
navigator.mozL10n.ready(Calls.init.bind(Calls));
