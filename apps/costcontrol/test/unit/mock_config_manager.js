'use strict';

var MockConfigManager = function(config) {

  function getMockRequiredMessage(mocking, parameter, isAFunction) {
    var whatIsBeingAccesed = mocking + (isAFunction ? '() is being called' :
                                                      'is being accessed');

    return 'Please, ' + whatIsBeingAccesed + '. Provide the key `' +
           parameter + '` in the constructor config object to mock it.';
  }

  var fakeSettings = config.fakeSettings || {};

  return {
    option: function(key) {
      return fakeSettings[key];
    },
    requestSettings: function(callback) {
      callback(JSON.parse(JSON.stringify(fakeSettings)));
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
