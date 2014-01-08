
var ConfigManager = (function() {

  'use strict';

  var today = new Date();

  var DEFAULT_SETTINGS = {
    'dataLimit': false,
    'dataLimitValue': 1,
    'dataLimitUnit': 'GB',
    'errors': {
      'INCORRECT_TOPUP_CODE': false,
      'BALANCE_TIMEOUT': false,
      'TOPUP_TIMEOUT': false
    },
    'fte': true,
    'waitingForBalance': null,
    'waitingForTopUp': null,
    'lastBalance': null,
    'lastBalanceRequest': null,
    'lastTopUpRequest': null,
    'lastDataUsage': {
      'timestamp': today,
      'start': today,
      'end': today,
      'today': today,
      'wifi': {
        'total': 0
      },
      'mobile': {
        'total': 0
      }
    },
    'lastTelephonyActivity': {
      'timestamp': today,
      'calltime': 0,
      'smscount': 0
    },
    'lastTelephonyReset': today,
    'lastDataReset': today,
    'lastCompleteDataReset': today,
    'lowLimit': false,
    'lowLimitThreshold': false,
    'lowLimitNotified': false,
    'zeroBalanceNotified': false,
    'dataUsageNotified': false,
    'nextReset': null,
    'plantype': 'postpaid',
    'resetTime': 1,
    'trackingPeriod': 'monthly',
    'isMobileChartVisible': true,
    'isWifiChartVisible': false
  };

  function getApplicationMode() {
    if (noConfigFound) {
      return 'DATA_USAGE_ONLY';
    }
    return settings.plantype.toUpperCase();
  }

  var configuration, configurationIndex, noConfigFound = false;
  function setConfig(newConfiguration) {
    configuration = newConfiguration;
    debug('Provider configuration done!');
  }

  // Load the operator configuration according to MCC_MNC pair
  function requestConfiguration(callback) {
    var currentDataIcc = Common.dataSimIcc;
    if (!currentDataIcc || !currentDataIcc.iccInfo) {
      console.error('No iccInfo available');
      return;
    }

    function returnConfiguration() {
      if (typeof callback === 'function') {
        callback(configuration);
      }
    }

    if (configuration) {
      setTimeout(function() {
        returnConfiguration();
      });
      return;
    }

    if (configurationIndex) {
      loadConfiguration(returnConfiguration);
    } else {
      loadConfigurationIndex(function onIndex() {
        loadConfiguration(returnConfiguration);
      });
    }
  }

  function loadConfiguration(callback) {
    var configFilePath = getConfigFilePath();
    LazyLoader.load(configFilePath, callback);
  }

  function getConfigFilePath() {
    var currentDataIcc = Common.dataSimIcc;
    var mcc = currentDataIcc.iccInfo.mcc;
    var mnc = currentDataIcc.iccInfo.mnc;
    var key = mcc + '_' + mnc;
    var configDir = configurationIndex[key];
    if (!configDir) {
      configDir = 'default';
      noConfigFound = true;
    }
    return 'js/config/' + configDir + '/config.js';
  }

  function loadConfigurationIndex(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/js/config/index.json', true);
    xhr.overrideMimeType('application/json');
    xhr.responseType = 'json';
    xhr.onload = function onXHRLoad() {
      if (xhr.status !== 200) {
        console.error('Error loading the configuration index! ' +
                      'Error code: ' + xhr.status);
        configurationIndex = {};
      }
      configurationIndex = xhr.response;
      if (typeof callback === 'function') {
        setTimeout(function() {
          callback();
        });
      }
    };
    xhr.send();
  }

  // Let's serialize dates
  // XXX: To avoid random error:
  // "DataCloneError: The object could not be cloned."
  // {file:
  // "app://costcontrol.gaiamobile.org/shared/js/async_storage.js" line: 90}]
  Date.prototype.toJSON = function() {
    return {'__date__': this.toISOString()};
  };
  function settingsReviver(k, v) {
    if (v === null || typeof v !== 'object' || !v.hasOwnProperty('__date__')) {
      return v;
    }

    return new Date(v['__date__']);
  }

  // Load stored settings
  var NO_ICCID = 'NOICCID';
  var settings;
  function requestSettings(callback) {
    var currentICCID = Common.dataSimIccId || NO_ICCID;
    asyncStorage.getItem(currentICCID, function _wrapGetItem(localSettings) {
      // No entry: set defaults
      try {
        settings = JSON.parse(localSettings, settingsReviver);
      } catch (e) {
        // If we can't parse the settings, use the default ones
      }

      if (settings === null) {
        settings = deepCopy(DEFAULT_SETTINGS);
        debug('Storing default settings for ICCID:', currentICCID);
        asyncStorage.setItem(currentICCID, JSON.stringify(settings));
      }

      if (callback) {
        callback(settings);
      }
    });
  }

  // Provides vendor configuration and settings
  function requestAll(callback) {
    requestConfiguration(function _afterConfig(configuration) {
      requestSettings(function _afterSettings(settings) {
        if (callback) {
          callback(configuration, settings);
        }
      });
    });
  }

  // Produce a optionchange for the given option
  function dispatchOptionChange(name, value, oldValue, settings) {
    var event = new CustomEvent('optionchange', { detail: {
      name: name,
      value: value,
      oldValue: oldValue,
      settings: settings
    } });
    window.dispatchEvent(event);
    debug('Event optionchange dispatched for', name);
  }

  // Set setting options asynchronously and dispatch an event for every
  // affected option.
  function setOption(options, callback) {
    // If settings is not ready, load and retry
    if (!settings) {
      requestSettings(function _afterEnsuringSettings() {
        setOption(options, callback);
      });
      return;
    }

    // Store former values and update with new ones
    var formerValue = {};
    for (var name in options) {
      if (options.hasOwnProperty(name)) {
        formerValue[name] = settings[name];
        settings[name] = options[name];
      }
    }

    var currentICCID = Common.dataSimIccId || NO_ICCID;
    asyncStorage.setItem(currentICCID, JSON.stringify(settings),
      function _onSet() {
        requestSettings(function _onSettings(settings) {
          for (var name in options) {
            if (options.hasOwnProperty(name)) {
                dispatchOptionChange(name, settings[name], formerValue[name],
                                     settings);
            }
          }
        });
        if (callback) {
          callback();
        }
      }
    );
  }

  // Part of the synchronous interface, return or set a setting.
  function syncOption(name, value) {
    var oldValue = settings[name];
    if (value === undefined) {
      return oldValue;
    }

    var update = {};
    update[name] = value;
    setOption(update);
  }

  var callbacks;
  // Function in charge of dispatch the events to the observers
  function callCallbacks(evt) {
    debug('Option', evt.detail.name, 'has changed!');
    var callbackCollection = callbacks[evt.detail.name] || [];
    for (var i = 0, callback; callback = callbackCollection[i]; i++) {
      callback(evt.detail.value, evt.detail.oldValue, evt.detail.name,
               evt.detail.settings);
    }
  }

  // Installs an observer to call when the setting has changed. It produces
  // an initial call to the callback unless you provide true as the last
  // parameter.
  function syncObserve(name, callback, avoidInitialCall) {
    debug('Installing observer for', name);

    // XXX: initialize this only if an observer is added
    if (callbacks === undefined) {
      callbacks = {};

      // Keeps the synchronization when the application need to communicate
      // instant information. Local storage event is used. The key sync is
      // read to determine which option has changed and a settingchange event
      // for that option is dispatched.
      window.addEventListener('storage', function _onSync(evt) {
        if (evt.key === 'sync') {
          var name = evt.newValue.split('#')[0];
          var oldValue = settings ? settings[name] : undefined;
          debug('Synchronization request for', name, 'received!');
          requestSettings(function _onSettings(newSettings) {
            settings = newSettings;
            dispatchOptionChange(name, settings[name], oldValue, settings);
          });
        }
      });

      window.addEventListener('optionchange', callCallbacks);
    }

    if (callbacks[name] === undefined) {
      callbacks[name] = [];
    }

    if (callbacks[name].indexOf(callback) < 0) {
      callbacks[name].push(callback);
      avoidInitialCall = avoidInitialCall || false;
      if (!avoidInitialCall && callback) {
        callback(settings[name], null, name, settings);
      }
    }
  }

  function syncRemoveObserver(name, callback) {
    var callbackCollection = callbacks[name];
    if (!callbackCollection) {
      return;
    }

    var index = callbackCollection.indexOf(callback);
    if (index > -1) {
      callbackCollection.splice(index, 1);
    }
  }

  function defaultValue(name) {
    return deepCopy(DEFAULT_SETTINGS[name]);
  }

  return {
    getApplicationMode: getApplicationMode,
    setConfig: setConfig,
    requestAll: requestAll,
    requestConfiguration: requestConfiguration,
    requestSettings: requestSettings,
    setOption: setOption,
    defaultValue: defaultValue,

    // XXX:These methods are the synchronous/cached interface. You need to
    // call requestAll() or requestSettings() to force cache renewal.
    // If you want to use observe() and option() as a getter, you need to setup
    // the cache by calling one of the former methods before. Only once is
    // enough.
    option: syncOption,
    observe: syncObserve,
    removeObserver: syncRemoveObserver,

    // XXX: Once loaded via requestConfiguration() / requestAll() it is ensured
    // it wont change so you can use this to access OEM confguration in a
    // synchronous fashion.
    get configuration() { return configuration; }
  };

}());
