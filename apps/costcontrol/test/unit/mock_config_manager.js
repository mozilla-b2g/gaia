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

    return new Date(v['__date__']);
  }

  function getMockRequiredMessage(mocking, parameter, isAFunction) {
    var whatIsBeingAccesed = mocking + (isAFunction ? '() is being called' :
                                                      'is being accessed');

    return 'Please, ' + whatIsBeingAccesed + '. Provide the key `' +
           parameter + '` in the constructor config object to mock it.';
  }

  var fakeSettings = config.fakeSettings || {};
  var fakeConfiguration = config.fakeConfiguration || {};

  return {
    option: function(key) {
      return fakeSettings[key];
    },
    requestAll: function(callback) {
      var self = this;
      self.requestConfiguration(function(configuration) {
        self.requestSettings(function(settings) {
          callback(configuration, settings);
        });
      });
    },
    requestConfiguration: function(callback) {
      callback(fakeConfiguration);
    },
    requestSettings: function(callback) {
      callback(JSON.parse(JSON.stringify(fakeSettings), settingsReviver));
    },
    setOption: function(options, callback) {
      (typeof callback === 'function') && callback();
    },
    observe: function() {},
    getApplicationMode: function() {
      assert.isDefined(
        config.applicationMode,
        getMockRequiredMessage('getApplicationMode', 'applicationMode', true)
      );
      return config.applicationMode;
    }
  };
};
