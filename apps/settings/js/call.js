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

  var _voiceServiceClassMask = gMobileConnection.ICC_SERVICE_CLASS_VOICE;

  // Display rule info.
  function displayRule(rules, elementId, settingKey) {
    var textSelector = 'input[data-setting="ril.cf.' + settingKey + '.number"]';
    var textInput = document.querySelector(textSelector);
    var switchSelector = 'input[name="ril.cf.' + settingKey + '.enabled"]';
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
  function toggleTapOnEntry() {
    var elementIds = ['li-cfu-desc',
                      'li-cfmb-desc',
                      'li-cfnrep-desc',
                      'li-cfnrea-desc'];
    elementIds.forEach(function(id) {
      document.getElementById(id).classList.toggle('disabled');
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

  // Check whether call forwaring is enabled for that specific reason.
  function checkForCallForwardingReasonEnabled(reason, callback) {
    var req = gMobileConnection.getCallForwardingOption(reason);
    req.onsuccess = function() {
      var rules = req.result;
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].active &&
            ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
          callback(true);
          return;
        }
      }
      callback(false);
    };
    req.onerror = function() {
      callback(false);
    };
  };

  // Get current call forwarding rules.
  function getCallForwardingOption() {
    displayInfoForAll(_('callForwardingRequesting'));

    // Queries rules for unconditional call forwarding.
    var unconditional = gMobileConnection.getCallForwardingOption(
      _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL);

    unconditional.onsuccess = function() {
      var unconditionalRules = unconditional.result;
      displayRule(unconditionalRules, 'cfu-desc', 'unconditional');

      // Queries rules for call forwarding when device busy.
      var mobileBusy = gMobileConnection.getCallForwardingOption(
        _cfReason.CALL_FORWARD_REASON_MOBILE_BUSY);

      mobileBusy.onsuccess = function() {
        var mobileBusyRules = mobileBusy.result;
        displayRule(mobileBusyRules, 'cfmb-desc', 'mobilebusy');

        // Queries rules for call forwarding when device does not reply.
        var noReply = gMobileConnection.getCallForwardingOption(
          _cfReason.CALL_FORWARD_REASON_NO_REPLY);

        noReply.onsuccess = function() {
          var noReplyRules = noReply.result;
          displayRule(noReplyRules, 'cfnrep-desc', 'noreply');

          // Queries rules for call forwarding when device is not reachable.
          var notReachable = gMobileConnection.getCallForwardingOption(
            _cfReason.CALL_FORWARD_REASON_NOT_REACHABLE);

          notReachable.onsuccess = function() {
            var notReachableRules = notReachable.result;
            displayRule(notReachableRules, 'cfnrea-desc', 'notreachable');

            toggleTapOnEntry();

            // Hide call forwarding icon if neccesary
            checkForCallForwardingReasonEnabled(_cfReason.CALL_FORWARD_REASON_UNCONDITIONAL,
              function onsuccess(enabled) {
                var settings = window.navigator.mozSettings;
                var lock = settings.createLock();
                var key = 'ril.cf.unconditional.enabled';
                var request = lock.get(key);
                request.onsuccess = function() {
                  if (!enabled && request.result[key]) {
                    var cset = {}; cset[key] = false;
                    lock.set(cset);
                  }
                };
            });
          };
          notReachable.onerror = function() {
            displayInfoForAll(_('callForwardingQueryError'));
          };
        };
        noReply.onerror = function() {
          displayInfoForAll(_('callForwardingQueryError'));
        };
      };
      mobileBusy.onerror = function() {
        displayInfoForAll(_('callForwardingQueryError'));
      };
    };
    unconditional.onerror = function() {
      displayInfoForAll(_('callForwardingQueryError'));
    };
  };

  // Public API.
  return {
    // Startup.
    init: function calls_init() {
      var settings = window.navigator.mozSettings;
      if (!settings) {
        displayInfoForAll(_('callForwardingQueryError'));
        return;
      }
      getCallForwardingOption();
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
            gMobileConnection.ICC_SERVICE_CLASS_VOICE;
          // TODO: Check number.
          mozMobileCFInfo['number'] = textInput.value;
          mozMobileCFInfo['timeSecond'] =
            mozMobileCFInfo['reason'] !=
              _cfReason.CALL_FORWARD_REASON_NO_REPLY ? 0 : 20;

          var req = gMobileConnection.setCallForwardingOption(mozMobileCFInfo);
          req.onsuccess = function() {
            toggleTapOnEntry();
            getCallForwardingOption();
          };
          req.onerror = function() {
            toggleTapOnEntry();
            getCallForwardingOption();
          };
        });
      });
    }
  };
})(this, document);

// Startup.
onLocalized(Calls.init.bind(Calls));

