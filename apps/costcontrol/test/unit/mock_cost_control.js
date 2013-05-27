'use strict';

var MockCostControl = function(config) {

  function getMockRequiredMessage(mocking, parameter, isAFunction) {
    var whatIsBeingAccesed = mocking + (isAFunction ? '() is being called' :
                                                      'is being accessed');

    return 'Please, ' + whatIsBeingAccesed + '. Provide the key `' +
           parameter + '` in the constructor config object to mock it.';
  }

  config = config || {};

  var fakeCostControlInstance = {
    getApplicationMode: function() {
      assert.isDefined(
        config.applicationMode,
        getMockRequiredMessage('getApplicationMode', 'applicationMode', true)
      );
      return config.applicationMode;
    }
  };

  return {
    getInstance: function(callback) {
      callback(fakeCostControlInstance);
    }
  };
};
