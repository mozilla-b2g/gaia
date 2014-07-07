/* exported MockConfigManager */
'use strict';

var MockConfigManager = function(config) {
  config = config || {};

  Date.prototype.toJSON = function() {
    return {'__date__': this.toISOString()};
  };
  function settingsReviver(k, v) {
    if (v === null || typeof v !== 'object' || !v.hasOwnProperty('__date__')) {
      return v;
    }

    return new Date(v.__date__);
  }

  function getMockRequiredMessage(mocking, parameter, isAFunction) {
    var whatIsBeingAccesed = mocking + (isAFunction ? '() is being called' :
                                                      'is being accessed');

    return 'Please, ' + whatIsBeingAccesed + '. Provide the key `' +
           parameter + '` in the constructor config object to mock it.';
  }

  var fakeSettings = config.fakeSettings || {};
  var fakeConfiguration = config.fakeConfiguration || {};
  var mCallbacks = {};
  return {
    option: function(key, value) {
      if (value) {
        fakeSettings[key] = value;
      }
      return fakeSettings[key];
    },
    requestAll: function(callback) {
      var self = this;
      self.requestConfiguration(function(configuration) {
        self.requestSettings(undefined, function(settings) {
          callback(configuration, settings);
        });
      });
    },
    requestConfiguration: function(callback) {
      callback(fakeConfiguration);
    },
    requestSettings: function(iccId, callback) {
      callback(JSON.parse(JSON.stringify(fakeSettings), settingsReviver));
    },
    setOption: function(options, callback) {
      Object.keys(options).forEach(function (name) {
        fakeSettings[name] = options[name];
      });
      (typeof callback === 'function') && callback();
    },
    observe: function(name, callback, avoidInitialCall) {
      if (typeof mCallbacks[name] !== 'function') {
        mCallbacks[name] = [];
      }
      mCallbacks[name] = callback;
    },
    getApplicationMode: function() {
      assert.isDefined(
        config.applicationMode,
        getMockRequiredMessage('getApplicationMode', 'applicationMode', true)
      );
      return config.applicationMode;
    },
    get configuration() { return config; },
    mTriggerCallback: function(name, value, settings) {
      if (typeof mCallbacks[name] === 'function') {
        mCallbacks[name](value, null, name, settings);
      }
    },
    mRemoveObservers: function() {
      mCallbacks = {};
    },
    setConfig: function(newConfig) {
      config = newConfig;
    }
  };
};
