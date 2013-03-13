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
  var _cfAction = {
    CALL_FORWARD_ACTION_DISABLE: 0,
    CALL_FORWARD_ACTION_ENABLE: 1,
    CALL_FORWARD_ACTION_QUERY_STATUS: 2,
    CALL_FORWARD_ACTION_REGISTRATION: 3,
    CALL_FORWARD_ACTION_ERASURE: 4
  };

  var mobileConnection = getMobileConnection();
  var _voiceServiceClassMask = mobileConnection.ICC_SERVICE_CLASS_VOICE;

  function setToSettingsDB(settingKey, value, callback) {
    var done = function done() {
      if (callback)
        callback();
    };

    var settings = window.navigator.mozSettings;
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
      }
      else
        done();
    };
    request.onerror = done;
  }

  // Display rule info.
  function displayRule(rules, elementId, settingKey) {
    var textSelector = 'input[data-setting="ril.cf.' + settingKey + '.number"]';
    var textInput = document.querySelector(textSelector);
    var switchSelector =
      'input[data-setting="ril.cf.' + settingKey + '.enabled"]';
    var switchInput = document.querySelector(switchSelector);

    for (var i = 0; i < rules.length; i++) {
      if (rules[i].active &&
          ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
        document.getElementById(elementId).textContent =
          _('callForwardingForwardingVoiceTo') + ' ' + rules[i].number;
        textInput.value = rules[i].number;
        switchInput.checked = true;
        document.getElementById('cf-' + settingKey + '-number').disabled = true;
        return;
      }
    }

    document.getElementById(elementId).textContent =
      _('callForwardingNotForwarding');
    textInput.value = '';
    switchInput.checked = false;
    document.getElementById('cf-' + settingKey + '-number').disabled = false;
  };

  // Enable/disable tapping on call forwarding entry.
  function enableTapOnEntry(enable) {
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

  // Display what's happening while requesting call forwarding info.
  function displayInfoForAll(what) {
    document.getElementById('cfu-desc').textContent =
      document.getElementById('cfmb-desc').textContent =
        document.getElementById('cfnrep-desc').textContent =
          document.getElementById('cfnrea-desc').textContent =
            what;
  };

  // Get current call forwarding rules.
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

            if (callback) {
              callback({
                'unconditional': unconditionalRules,
                'mobilebusy': mobileBusyRules,
                'noreply': noReplyRules,
                'notreachable': notReachableRules
              });
            }
          };
          notReachable.onerror = onerror;
        };
        noReply.onerror = onerror;
      };
      mobileBusy.onerror = onerror;
    };
    unconditional.onerror = onerror;
  };

  function updateCallForwardingEntryCore(cfOptions) {
    displayRule(cfOptions['unconditional'], 'cfu-desc', 'unconditional');
    displayRule(cfOptions['mobilebusy'], 'cfmb-desc', 'mobilebusy');
    displayRule(cfOptions['noreply'], 'cfnrep-desc', 'noreply');
    displayRule(cfOptions['notreachable'], 'cfnrea-desc', 'notreachable');
  }

  function updateCallForwardingEntryWithOption(cfOptions) {
    if (cfOptions) {
      updateCallForwardingEntryCore(cfOptions);
      enableTapOnEntry(true);
    } else {
      displayInfoForAll(_('callForwardingQueryError'));
      enableTapOnEntry(false);
    }
  }

  var updateCFEntryLock = false;
  var requestUpdateCFEntryDuringLock = false;
  function updateCallForwardingEntry() {
    if (updateCFEntryLock) {
      requestUpdateCFEntryDuringLock = true;
      return;
    }
    else
      updateCFEntryLock = true;

    displayInfoForAll(_('callForwardingRequesting'));
    enableTapOnEntry(false);
    getCallForwardingOption(function got_cfOption(cfOptions) {
      updateCallForwardingEntryWithOption(cfOptions);

      updateCFEntryLock = false;
      if (requestUpdateCFEntryDuringLock) {
        requestUpdateCFEntryDuringLock = false;
        updateCallForwardingEntry();
      }
    });
  }

  function initCallForwardingObservers() {
    var settings = window.navigator.mozSettings;
    var settingKeys = ['unconditional',
                       'mobilebusy',
                       'noreply',
                       'notreachable'];
    settingKeys.forEach(function(key) {
      settings.addObserver('ril.cf.' + key + '.enabled', function(event) {
        var selector = 'input[data-setting="ril.cf.' + key + '.number"]';
        var textInput = document.querySelector(selector);
        var mozMobileCFInfo = {};

        mozMobileCFInfo['action'] = event.settingValue ?
          _cfAction.CALL_FORWARD_ACTION_REGISTRATION :
          _cfAction.CALL_FORWARD_ACTION_DISABLE;
        switch (key) {
          case 'unconditional':
            mozMobileCFInfo['reason'] =
              _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL;
            break;
          case 'mobilebusy':
            mozMobileCFInfo['reason'] =
              _cfReason.CALL_FORWARD_REASON_MOBILE_BUSY;
            break;
          case 'noreply':
            mozMobileCFInfo['reason'] =
              _cfReason.CALL_FORWARD_REASON_NO_REPLY;
            break;
          case 'notreachable':
            mozMobileCFInfo['reason'] =
              _cfReason.CALL_FORWARD_REASON_NOT_REACHABLE;
            break;
        }
        mozMobileCFInfo['serviceClass'] =
          mobileConnection.ICC_SERVICE_CLASS_VOICE;
        // TODO: Check number.
        mozMobileCFInfo['number'] = textInput.value;
        mozMobileCFInfo['timeSecond'] =
          mozMobileCFInfo['reason'] !=
            _cfReason.CALL_FORWARD_REASON_NO_REPLY ? 0 : 20;

        var req = mobileConnection.setCallForwardingOption(mozMobileCFInfo);
        req.onsuccess = function() {
          updateCallForwardingEntry();
        };
        req.onerror = function() {
          updateCallForwardingEntry();
        };
      });
    });
  }

  // Call subpanel navigation control.
  var oldHash = document.location.hash || '#root';
  function initCallForwarding() {
    var settings = window.navigator.mozSettings;
    if (!settings) {
      displayInfoForAll(_('callForwardingQueryError'));
      return;
    }

    // Init call forwarding option
    displayInfoForAll(_('callForwardingRequesting'));
    getCallForwardingOption(function call_gotCFOption(options) {
      if (!options) {
        updateCallForwardingEntryWithOption(options);
        return;
      }

      // wait for all DB settings completed
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
          updateCallForwardingEntryWithOption(options);
          setTimeout(initCallForwardingObservers, 500);
        }
      };

      // Ensure the settings being set to the setting DB
      Object.keys(options).forEach(function call_forEachCFOption(settingKey) {
        var rules = options[settingKey];
        var hasValidRule = false;
        for (var i = 0; i < rules.length; i++) {
          if (rules[i].active &&
            ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
            asyncOpChecker.runTask(setToSettingsDB,
              'ril.cf.' + settingKey + '.number', rules[i].number);
            asyncOpChecker.runTask(setToSettingsDB,
              'ril.cf.' + settingKey + '.enabled', true);
            hasValidRule = true;
            break;
          }
        }

        if (!hasValidRule) {
          asyncOpChecker.runTask(setToSettingsDB,
            'ril.cf.' + settingKey + '.number', '');
          asyncOpChecker.runTask(setToSettingsDB,
            'ril.cf.' + settingKey + '.enabled', false);
        }
      });
    });

    window.addEventListener('hashchange', function() {
      // If navigation is from #root to #call panels then update UI always.
      if (document.location.hash === '#call' &&
          !oldHash.startsWith('#call-cf-')) {
        if (!updateCFEntryLock) {
          updateCallForwardingEntry();
        }
      }
      oldHash = document.location.hash;
    });
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
    var settings = window.navigator.mozSettings;
    if (!settings) {
      return;
    }

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

    // Initialize the alert panel
    var alertLabel =
      document.querySelector('#menuItem-callWaiting .alert-label');
    var alertPanel = document.querySelector('#call .cw-alert');
    var alertLabel =
      document.querySelector('#menuItem-callWaiting .alert-label');
    var confirmInput =
      alertPanel.querySelector('.cw-alert-checkbox-label input');
    var setBtn = alertPanel.querySelector('.cw-alert-set');
    var cancelBtn = alertPanel.querySelector('.cw-alert-cancel');

    alertLabel.addEventListener('click', function cs_alertLabelClicked(event) {
      confirmInput.checked = false;
      alertPanel.hidden = false;
    });

    setBtn.addEventListener('click', function cs_alertSetClicked(event) {
      setToSettingsDB('ril.callwaiting.enabled', confirmInput.checked);
      alertPanel.hidden = true;
    });

    cancelBtn.addEventListener('click', function cs_alertCancelClicked(event) {
      alertPanel.hidden = true;
    });
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

