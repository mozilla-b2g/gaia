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
    elementIds.forEach(function(id) {
      if (enable)
        document.getElementById(id).classList.remove('disabled');
      else
        document.getElementById(id).classList.add('disabled');
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
    var simCardState = mobileConnection.cardState;
    /**
     * Check SIM card state
     * Possible values: null, 'unknown', 'absent', 'pinRequired',
     * 'pukRequired', 'networkLocked', 'ready'.
     */
    switch (simCardState) {
      case 'absent':
        displayInfoForAll(_('noSimCard'));
        break;
      case 'pinRequired':
        displayInfoForAll(_('simCardLockedMsg'));
        break;
      case 'pukRequired':
        displayInfoForAll(_('simCardLockedMsg'));
        break;
      case 'networkLocked':
        displayInfoForAll(_('simLockedPhone'));
        break;
      case 'unknown':
        displayInfoForAll(_('unknownSimCardState'));
        break;
      case null:
        displayInfoForAll(_('simCardNotReady'));
        break;
      default:
        // For any other case (including 'ready') display
        // the call forwarding network request message
        displayInfoForAll(_('callForwardingRequesting'));
    }
  };

  // Stores current states (enabler or not) of the call forwaring reason.
  var _cfReasonStates = [0, 0, 0, 0];
  var ignoreSettingChanges = false;
  // Gets current call forwarding rules.
  function getCallForwardingOption(callback) {
    var onerror = function call_getCWOptionError() {
      if (callback)
        callback(null);
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

  var updatingInProgress = false;
  function updateCallForwardingSubpanels() {
    updatingInProgress = true;

    displaySimCardStateInfo();
    enableTapOnCallForwardingItems(false);
    getCallForwardingOption(function got_cfOption(cfOptions) {
      if (cfOptions) {
        displayRule(cfOptions['unconditional'], 'cfu-desc', 'unconditional');
        displayRule(cfOptions['mobilebusy'], 'cfmb-desc', 'mobilebusy');
        displayRule(cfOptions['noreply'], 'cfnrep-desc', 'noreply');
        displayRule(cfOptions['notreachable'], 'cfnrea-desc', 'notreachable');
        enableTapOnCallForwardingItems(true);
      } else {
        displaySimCardStateInfo();
        enableTapOnCallForwardingItems(false);
      }
      updatingInProgress = false;
    });
  }

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
        if (mobileConnection.cardState !== 'ready') {
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
          updateCallForwardingSubpanels();
          return;
        }
        mozMobileCFInfo['number'] = textInput.value;
        mozMobileCFInfo['timeSecond'] =
          mozMobileCFInfo['reason'] !=
            _cfReason.CALL_FORWARD_REASON_NO_REPLY ? 0 : 20;

        var req = mobileConnection.setCallForwardingOption(mozMobileCFInfo);
        req.onsuccess = function() {
          updateCallForwardingSubpanels();
        };
        req.onerror = function() {
          updateCallForwardingSubpanels();
        };
      });
    });
  }

  // Call subpanel navigation control.
  var oldHash = document.location.hash || '#root';
  function initCallForwarding() {
    if (!settings || !mobileConnection) {
      displayInfoForAll(_('callForwardingQueryError'));
      return;
    }

    if (mobileConnection.cardState === 'absent') {
      displayInfoForAll('');
      return;
    }

    // Prevent sub panels from being selected while airplane mode.
    mobileConnection.addEventListener('cardstatechange', function() {
      enableTapOnCallForwardingItems(mobileConnection.cardState === 'ready');
    });

    // Init call forwarding option.
    displaySimCardStateInfo();
    getCallForwardingOption(function call_gotCFOption(cfOptions) {
      if (cfOptions) {
        displayRule(cfOptions['unconditional'], 'cfu-desc', 'unconditional');
        displayRule(cfOptions['mobilebusy'], 'cfmb-desc', 'mobilebusy');
        displayRule(cfOptions['noreply'], 'cfnrep-desc', 'noreply');
        displayRule(cfOptions['notreachable'], 'cfnrea-desc', 'notreachable');
        enableTapOnCallForwardingItems(true);
      } else {
        displayInfoForAll(_('callForwardingQueryError'));
        enableTapOnCallForwardingItems(false);
      }
      setTimeout(initCallForwardingObservers, 500);
    });

    // Initialize the call forwarding alert panel.
    var cfAlertPanel = document.querySelector('#call .cf-alert');
    var cfContinueBtn = cfAlertPanel.querySelector('.cf-alert-continue');
    cfContinueBtn.addEventListener('click', function() {
      cfAlertPanel.hidden = true;
    });

    window.addEventListener('hashchange', function() {
      // If navigation is from #root to #call panels then update UI always.
      if (document.location.hash === '#call' &&
          !oldHash.startsWith('#call-cf-')) {
        if (!updatingInProgress) {
          updateCallForwardingSubpanels();
        }
      }
      oldHash = document.location.hash;
    });
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
      menuItem.classList.remove('disabled');
      alertLabel.addEventListener('click', callWaitingItemListener);
    } else {
      menuItem.classList.add('disabled');
      alertLabel.removeEventListener('click', callWaitingItemListener);
    }
  }

  function updateCallWaitingItemState(callWaitingEnabled) {
    var menuItem = document.querySelector('#menuItem-callWaiting');
    var input = menuItem.querySelector('.checkbox-label input');

    if (callWaitingEnabled === null)
      menuItem.dataset.state = 'unknown';
    else {
      input.checked = callWaitingEnabled;
      if (callWaitingEnabled)
        menuItem.dataset.state = 'on';
      else
        menuItem.dataset.state = 'off';
    }
  }

  function initCallWaiting() {
    if (!settings || !mobileConnection) {
      enableTabOnCallWaitingItem(false);
      return;
    }

    if (mobileConnection.cardState === 'absent') {
      enableTabOnCallWaitingItem(false);
      return;
    }

    // Prevent the item from being changed while airplane mode.
    mobileConnection.addEventListener('cardstatechange', function() {
      enableTabOnCallWaitingItem(mobileConnection.cardState === 'ready');
    });


    var alertPanel = document.querySelector('#call .cw-alert');
    var alertLabel =
      document.querySelector('#menuItem-callWaiting .alert-label');
    var setBtn = alertPanel.querySelector('.cw-alert-set');
    var cancelBtn = alertPanel.querySelector('.cw-alert-cancel');

    alertLabel.addEventListener('click', callWaitingItemListener);

    setBtn.addEventListener('click', function cs_alertSetClicked(event) {
      var confirmInput =
        alertPanel.querySelector('.cw-alert-checkbox-label input');
      setToSettingsDB('ril.callwaiting.enabled', confirmInput.checked);
      alertPanel.hidden = true;
    });

    cancelBtn.addEventListener('click', function cs_alertCancelClicked(event) {
      alertPanel.hidden = true;
    });

    // Bind call waiting setting to the input
    var input =
      document.querySelector('#menuItem-callWaiting .checkbox-label input');
    input.addEventListener('change', function cs_cwInputChanged(event) {
      setToSettingsDB('ril.callwaiting.enabled', input.checked);
    });

    settings.addObserver('ril.callwaiting.enabled',
      function call_callWaitingChanged(event) {
        updateCallWaitingItemState(event.settingValue);
    });

    var getCWEnabled = settings.createLock().get('ril.callwaiting.enabled');
    getCWEnabled.onsuccess = function cs_getCWEnabledSuccess() {
      updateCallWaitingItemState(
        getCWEnabled.result['ril.callwaiting.enabled']);
    };

  }

  // Public API.
  return {
    // Startup.
    init: function calls_init() {
      initCallForwarding();
      initCallWaiting();
    }
  };
})(this, document);

// Startup.
navigator.mozL10n.ready(Calls.init.bind(Calls));
