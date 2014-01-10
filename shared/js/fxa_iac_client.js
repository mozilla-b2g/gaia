'use strict';
// Firefox Accounts IAC client

var FxAccountsIACHelper = function FxAccountsIACHelper() {

  var DEFAULT_CONNECTION_STRING = 'fxa-mgmt';
  var default_rules = {
    'manifestURLs': ['app://system.gaiamobile.org/manifest.webapp']
  };

  var CONNECTION_STRING = DEFAULT_CONNECTION_STRING;
  var rules = default_rules;

  // Overrides the default configuration, if needed
  var init = function init(options) {
    if (!options) {
      return;
    }

    if (options.keyword &&
      typeof(options.keyword) == 'string' &&
      options.keyword.length > 0) {
      CONNECTION_STRING = options.keyword;
    }

    if (options.rules && typeof(options.rules) == 'object') {
      rules = options.rules;
    }
  };

  // Reset to default values, could clean any future option
  var reset = function reset() {
    CONNECTION_STRING = DEFAULT_CONNECTION_STRING;
    rules = default_rules;
  };

  // Sends the specific message via IAC to the system app.
  // Will be always using the default keyword and forcing it
  // to a single manifest.
  var sendMessage = function sendMessage(message, successCb, errorCb) {
    getSelf(function onApp(app) {
      if (!errorCb || typeof errorCb !== 'function') {
        errorCb = function() {};
      }

      app.connect(CONNECTION_STRING, rules).then(function(ports) {
        if (!ports || ports.length !== 1) {
          errorCb();
          return;
        }

        var port = ports[0];

        port.postMessage(message);
        port.onmessage = function onMessage(evt) {
          if (evt && evt.data) {
            var realMessage = evt.data;
            if (typeof realMessage.data !== 'undefined') {
              successCb(realMessage.data);
            } else {
              var errorType = realMessage.error || 'Unknown';
              errorCb(errorType);
            }
          } else {
            errorCb('Unknown');
          }
        };
      }, errorCb);
    }, errorCb);
  };

  var getAccounts = function getAccounts(successCb, errorCb) {
    sendMessage({
      'name': 'getAccounts'
    }, successCb, errorCb);
  };

  var openFlow = function openFlow(successCb, errorCb) {
    sendMessage({
      'name': 'openFlow'
    }, successCb, errorCb);
  };

  var logout = function logout(successCb, errorCb) {
    sendMessage({
      'name': 'logout'
    }, successCb, errorCb);
  };

  var changePassword = function changePassword(accountId, successCb, errorCb) {
    sendMessage({
      'name': 'changePassword',
      'accountId': accountId
    }, successCb, errorCb);
  };

  // Get a reference to the application object to be able to invoke IAC.
  var getSelf = function getSelf(cb, error) {
    var request = navigator.mozApps.getSelf();
    request.onsuccess = function onSuccess(evt) {
      cb(evt.target.result);
    };

    request.onerror = function onError() {
      if (error && typeof(error) === 'function') {
        error();
      }
    };
  };

  return {
    'changePassword': changePassword,
    'getAccounts': getAccounts,
    'init': init,
    'logout': logout,
    'openFlow': openFlow,
    'reset': reset
  };

}();
