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
    var textInput = document.querySelector('input[data-setting="ril.cf.' + settingKey + '.number"]');
    var switchInput = document.querySelector('input[name="ril.cf.' + settingKey + '.enabled"]');

    for (var i = 0; i < rules.length; i++) {
      if (rules[i].active &&
          ((_voiceServiceClassMask & rules[i].serviceClass) != 0)) {
        document.getElementById(elementId).textContent =
          _('callForwardingForwardingVoiceTo') + ' ' + rules[i].number;
        textInput.value = rules[i].number;
        switchInput.checked = true;
        return;
      }
    }

    document.getElementById(elementId).textContent =
      _('callForwardingNotForwarding');
    textInput.value = '';
    switchInput.checked = false;
  };

  // Display what's happening while getting call forwarding info.
  function displayInfoForAll(what) {
    document.getElementById('cfu-desc').textContent =
      document.getElementById('cfmb-desc').textContent =
        document.getElementById('cfnrep-desc').textContent =
          document.getElementById('cfnrea-desc').textContent =
            what;
  };

  // Get current call forwarding rules.
  function getCallForwardingOption() {
    displayInfoForAll(_('callForwardingGetting'));

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
          };
          notReachable.onerror = function () {
            displayInfoForAll(_('callForwardingQueryError'));
          };
        };
        noReply.onerror = function () {
          displayInfoForAll(_('callForwardingQueryError'));
        };
      };
      mobileBusy.onerror = function () {
        displayInfoForAll(_('callForwardingQueryError'));
      };
    };
    unconditional.onerror = function () {
      displayInfoForAll(_('callForwardingQueryError'));
    };
  };

  // Public API.
  return {
    // Startup.
    init: function calls_init() {
      var settings = window.navigator.mozSettings;
      if (!settings) {
        // TODO: Update UI with some error info.
        return;
      }
      getCallForwardingOption();
      var settingKeys = ['unconditional',
                         'mobilebusy',
                         'noreply',
                         'notreachable'];
      settingKeys.forEach(function(key) {
        settings.addObserver('ril.cf.' + key + '.enabled', function(event) {
          var textInput = document.querySelector('input[data-setting="ril.cf.' + key + '.number"]');
          var mozMobileCFInfo = {};

          mozMobileCFInfo['action'] = event.settingValue ?
            _cfAction.CALL_FORWARD_ACTION_REGISTRATION :
            _cfAction.CALL_FORWARD_ACTION_DISABLE;
          switch (key) {
            case 'unconditional':
              mozMobileCFInfo['reason'] = _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL;
              break;
            case 'mobilebusy':
              mozMobileCFInfo['reason'] = _cfReason.CALL_FORWARD_REASON_MOBILE_BUSY;
              break;
            case 'noreply':
              mozMobileCFInfo['reason'] = _cfReason.CALL_FORWARD_REASON_NO_REPLY;
              break;
            case 'notreachable':
              mozMobileCFInfo['reason'] = _cfReason.CALL_FORWARD_REASON_NOT_REACHABLE;
              break;
          }
          mozMobileCFInfo['serviceClass'] = gMobileConnection.ICC_SERVICE_CLASS_VOICE;
          // TODO: Check number.
          mozMobileCFInfo['number'] = textInput.value;
          mozMobileCFInfo['timeSecond'] =
            mozMobileCFInfo['reason'] != _cfReason.CALL_FORWARD_REASON_NO_REPLY ?
            0 : 20;
          console.log(JSON.stringify(mozMobileCFInfo));

          var req = gMobileConnection.setCallForwardingOption(mozMobileCFInfo);
          req.onsuccess = function() {
            console.log("Success");
            getCallForwardingOption();
          };
          req.onerror = function() {
            console.log("Error");
            getCallForwardingOption();
          };
        });
      });
    }
  };
})(this, document);

// Startup.
onLocalized(Calls.init.bind(Calls));
