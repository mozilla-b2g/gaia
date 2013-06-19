'use strict';

var MockCommon = function(config) {

  function getMockRequiredMessage(mocking, parameter, isAFunction) {
    var whatIsBeingAccesed = mocking + (isAFunction ? '() is being called' :
                                                      'is being accessed');

    return 'Please, ' + whatIsBeingAccesed + '. Provide the key `' +
           parameter + '` in the constructor config object to mock it.';
  }

  config = config || {};

  return {
    COST_CONTROL_APP: 'app://costcontrol.gaiamobile.org',
    isValidICCID: function(iccid) {
      assert.isDefined(
        config.isValidICCID,
        getMockRequiredMessage('isValidICCID', 'isValidICCID', true)
      );
      return config.isValidICCID;
    },
    waitForDOMAndMessageHandler: function(window, callback) {
      callback();
    },
    checkSIMChange: function(callback) {
      callback();
    },
    startFTE: function(mode) {
      var event = new CustomEvent('ftestarted', { detail: mode });
      window.dispatchEvent(event);
    },
    startApp: function() {
      var event = new CustomEvent('appstarted');
      window.dispatchEvent(event);
    },
    closeApplication: function() {
      var event = new CustomEvent('appclosed');
      window.dispatchEvent(event);
    },
    modalAlert: function(msg) {
      var event = new CustomEvent('fakealert', { detail: msg });
      window.dispatchEvent(event);
      console.log('Alert: ' + msg);
    }
  };
};
