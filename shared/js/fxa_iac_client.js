'use strict';
// Firefox Accounts IAC client

var FxAccountsIACHelper = function FxAccountsIACHelper() {

  var DEFAULT_CONNECTION_STRING = 'fxa-mgmt';
  var default_rules = {
    'manifestURLs': ['app://system.gaiamobile.org/manifest.webapp']
  };

  var CONNECTION_STRING = DEFAULT_CONNECTION_STRING;
  var rules = default_rules;
  var port;

  var callbacks = {};
  var eventListeners = {};

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

  var addEventListener = function addEventListener(eventName, listener) {
    if (!eventListeners[eventName]) {
      eventListeners[eventName] = [];
    }
    eventListeners[eventName].push(listener);
  };

  var removeEventListener = function removeEventListener(eventName, listener) {
    var listeners = eventListeners[eventName];
    if (!listeners) {
      return;
    }

    var index = listeners.indexOf(listener);
    if (index === -1) {
      return;
    }
    listeners.splice(index, 1);
  };

  // Reset to default values, could clean any future option
  var reset = function reset() {
    CONNECTION_STRING = DEFAULT_CONNECTION_STRING;
    rules = default_rules;
    eventListeners = {};
    callbacks = {};
  };

  var onMessage = function onMessage(evt) {
    if (evt && evt.data) {
      var message = evt.data;

      if (message.eventName) {
        var listeners = eventListeners[message.eventName];
        if (!listeners) {
          return;
        }
        for (var listener in listeners) {
          if (listeners[listener] &&
              typeof listeners[listener] === 'function') {
            listeners[listener]();
          }
        }
        return;
      }

      var cbs;
      if (message.methodName) {
        cbs = callbacks[message.methodName];
        if (!cbs) {
          console.warn('No callbacks for method ' + message.methodName);
          return;
        }
      }

      if (typeof message.data !== 'undefined') {
        cbs.successCb(message.data);
      } else {
        var errorType = message.error || 'Unknown';
        cbs.errorCb(errorType);
      }
    } else {
      console.error('Unknown');
    }
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

  var connect = function connect(callback) {
    getSelf(function onApp(app) {
      if (!app) {
        return;
      }
      app.connect(CONNECTION_STRING, rules).then(function(ports) {
        if (!ports || ports.length !== 1) {
          return;
        }

        port = ports[0];
        callback && callback();
      });
    });
  };

  var sendMessage = function sendMessage(message, successCb, errorCb) {
    if (port) {
      _sendMessage(message, successCb, errorCb);
      return;
    }

    connect(function() {
      _sendMessage(message, successCb, errorCb);
    });
  };

  // Sends the specific message via IAC to the system app.
  // Will be always using the default keyword and forcing it
  // to a single manifest.
  var _sendMessage = function _sendMessage(message, successCb, errorCb) {
    var name = message.name;
    if (!name) {
      return;
    }

    if (!callbacks[name]) {
      callbacks[name] = {};
    }
    callbacks[name].successCb = successCb;
    callbacks[name].errorCb = errorCb;
    // We set onmessage here again cause it is the only way that we have to
    // trigger it during the tests. It sucks but it is harmless.
    port.onmessage = onMessage;
    port.postMessage(message);
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

  // We do an early connection to be able to get the unsolicited events coming
  // from the platform (onlogin, onverifiedlogin, onlogout).
  connect();

  return {
    'addEventListener': addEventListener,
    'getAccounts': getAccounts,
    'init': init,
    'logout': logout,
    'openFlow': openFlow,
    'removeEventListener': removeEventListener,
    'reset': reset
  };

}();
