'use strict';

requireApp('costcontrol/test/unit/mock_all_network_interfaces.js');

var MockCommon = function(config) {

  function getMockRequiredMessage(mocking, parameter, isAFunction) {
    var whatIsBeingAccesed = mocking + (isAFunction ? '() is being called' :
                                                      'is being accessed');

    return 'Please, ' + whatIsBeingAccesed + '. Provide the key `' +
           parameter + '` in the constructor config object to mock it.';
  }

  config = config || {};

  var fakeAllInterfaces = MockAllNetworkInterfaces;

  return {
    COST_CONTROL_APP: 'app://costcontrol.gaiamobile.org',
    allNetworkInterfaces: {},
    dataSimIccId: null,
    dataSimIcc: null,
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
    checkSIM: function(callback) {
      callback();
    },
    startFTE: function(mode) {
      var iframe = document.getElementById('fte_view');
      iframe.classList.remove('non-ready');
      var event = new CustomEvent('ftestarted', { detail: mode });
      window.dispatchEvent(event);
    },
    closeFTE: function() {
      var iframe = document.getElementById('fte_view');
      iframe.classList.add('non-ready');
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
    },
    getDataSIMInterface: function getDataSIMInterface() {
      var dataSimCard = fakeAllInterfaces[1];
      return dataSimCard;
    },
    getWifiInterface: function() {
      var wifiInterface = fakeAllInterfaces[0];
      return wifiInterface;
    },
    getIccInfo: function() { return;},
    loadNetworkInterfaces: function() {
      setTimeout(function() {
        Common.allNetworkInterfaces = allInterfacesFake;
      }, 0);
    },
    loadDataSIMIccId: function(onsuccess, onerror) {
      setTimeout(function() {
        Common.dataSimIccId = allInterfacesFake[1].id;
        if (typeof onsuccess === 'function') {
          onsuccess(Common.dataSimIccId);
        }
      }, 0);
    }
  };
};
