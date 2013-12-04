'use strict';

/**
 * IccHelper redirect calls to ICC related APIs to correct object. IccHelper is
 * created for backward compatibility of gaia master after the patch of
 * bug 814637 landed in m-c. In the patch the interface provided by IccManager
 * was moved to a MozIcc object. Details please refer to the URL[1].
 * The helper *MUST* be removed once all gaia developement no longer depend
 * on b2g26.
 * [1]: https://wiki.mozilla.org/WebAPI/WebIccManager/Multi-SIM
 */
(function(exports) {
  var _iccManager = navigator.mozIccManager;
  var _iccProxy = null;

  Object.defineProperty(exports, 'IccHelper', {
    configurable: true,
    get: function() {
      return _iccProxy;
    },
    // This is for code that sets value to IccHelper. And for unit tests that
    // mock IccHelper.
    set: function(value) {
      _iccProxy = value;
    }
  });

  if (_iccManager && _iccManager.getIccById) {
    var activeIccObj = null;

    var eventListeners = {};
    var cachedEventListeners = {}; // cache on + 'eventName' event handlers
    var events = ['cardstatechange', 'iccinfochange',
                  'stkcommand', 'stksessionend'];

    var getters = ['iccInfo', 'cardState'];
    var methods = ['sendStkResponse', 'sendStkMenuSelection',
                   'sendStkTimerExpiration', 'sendStkEventDownload'];
    var domRequests = ['getCardLock', 'unlockCardLock', 'setCardLock',
                       'getCardLockRetryCount', 'readContacts',
                       'updateContact', 'iccOpenChannel', 'iccExchangeAPDU',
                       'iccCloseChannel'];

    var getterTemplate = function(name) {
      return function() {
        if (activeIccObj) {
          return activeIccObj[name];
        } else {
          return null;
        }
      };
    };

    var methodTemplate = function(name) {
      return function() {
        if (activeIccObj) {
          return activeIccObj[name].apply(activeIccObj, arguments);
        }
      };
    };

    var domRequestTemplate = function(name) {
      return function() {
        if (activeIccObj) {
          return activeIccObj[name].apply(activeIccObj, arguments);
        } else {
          throw new Error('The icc object is invalid');
        }
      };
    };

    // Multi-SIM API available
    var createIccProxy = function() {
      var iccProxy = {
        addEventListener: function(eventName, callback) {
          if (typeof callback !== 'function')
            return;
          if (events.indexOf(eventName) === -1)
            return;

          var listeners = eventListeners[eventName];
          if (listeners == null) {
            listeners = eventListeners[eventName] = [];
          }
          if (listeners.indexOf(callback) === -1) {
            listeners.push(callback);
          }
        },
        removeEventListener: function(eventName, callback) {
          var listeners = eventListeners[eventName];
          if (listeners) {
            var index = listeners.indexOf(callback);
            if (index !== -1) {
              listeners.splice(index, 1);
            }
          }
        }
      };

      getters.forEach(function(getter) {
        Object.defineProperty(iccProxy, getter, {
          enumerable: true,
          get: getterTemplate(getter)
        });
      });

      methods.forEach(function(method) {
        iccProxy[method] = methodTemplate(method);
      });

      domRequests.forEach(function(request) {
        iccProxy[request] = methodTemplate(request);
      });

      events.forEach(function(eventName) {
        // Define 'on' + eventName properties
        // Assigning an event handler and adding an event listener are
        // handled separately. We need to simulate the same behavior in
        // IccHelper.
        Object.defineProperty(iccProxy, 'on' + eventName, {
          enumerable: true,
          set: function(newListener) {
            var oldListener = cachedEventListeners[eventName];
            if (oldListener) {
              iccProxy.removeEventListener(eventName, oldListener);
            }
            cachedEventListeners[eventName] = newListener;

            if (newListener) {
              iccProxy.addEventListener(eventName, newListener);
            }
          },
          get: function() {
            return cachedEventListeners[eventName];
          }
        });
      });

      return iccProxy;
    };

    // Initialize icc proxy
    _iccProxy = createIccProxy();
    if (_iccManager.iccIds && _iccManager.iccIds.length) {
      activeIccObj = _iccManager.getIccById(_iccManager.iccIds[0]);

      if (activeIccObj) {
        // register to callback
        events.forEach(function(eventName) {
          activeIccObj.addEventListener(eventName, function(event) {
            var listeners = eventListeners[eventName];
            if (listeners) {
              listeners.forEach(function(listener) {
                listener(event);
              });
            }
          });
        });
      }
    }

    _iccManager.oniccdetected = function(event) {
      if (_iccProxy.cardState == null) {
        activeIccObj = _iccManager.getIccById(event.iccId);

        if (activeIccObj) {
          // register to callback
          events.forEach(function(eventName) {
            activeIccObj.addEventListener(eventName, function(event) {
              var listeners = eventListeners[eventName];
              if (listeners) {
                listeners.forEach(function(listener) {
                  listener(event);
                });
              }
            });
          });

          // trigger cardstatechange and iccinfochange manually when a mozIcc
          // object becomes valid (detected).
          ['cardstatechange', 'iccinfochange'].forEach(function(eventName) {
            if (eventListeners[eventName]) {
              eventListeners[eventName].forEach(function(listener) {
                listener();
              });
            }
          });
        }
      }
    };
  } else {
    _iccProxy = _iccManager;
  }
})(window);
