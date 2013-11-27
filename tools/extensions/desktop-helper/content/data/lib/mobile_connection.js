!function() {

  function debug(str) {
    //dump('mozMobileConnection: ' + str + '\n');
  }

  var initialized = true;
  var fakeNetwork = { shortName: 'Fake Orange F', mcc: '208', mnc: '1' };
  var fakeVoice = {
    network: fakeNetwork,
    state: 'notSearching',
    roaming: true,
    connected: true,
    emergencyCallsOnly: false
  };
  var fakeNetwork2 = { shortName: 'Verizon Fake', mcc: '208', mnc: '1' };
  var fakeVoice2 = {
    network: fakeNetwork2,
    state: 'notSearching',
    roaming: true,
    connected: true,
    emergencyCallsOnly: false
  };

  function fakeEventListener(type, callback, bubble) {
    if (initialized)
      return;

    // simulates a connection to a data network;
    setTimeout(function fakeCallback() {
      initialized = true;
      if (typeof callback === 'function') {
        callback({ iddId: this.iccId });
      }
    }.bind(this), 5000);
  }

  FFOS_RUNTIME.makeNavigatorShim('mozMobileConnections', [{
    iccId: 111,
    addEventListener: fakeEventListener,
    removeEventListener: function() {},
    getCallWaitingOption: FFOS_RUNTIME.domRequest(true),
    getCallForwardingOption: FFOS_RUNTIME.domRequest(1),
    setCallWaitingOption: FFOS_RUNTIME.domRequest(),
    getCallingLineIdRestriction: FFOS_RUNTIME.domRequest(),
    get data() {
      return initialized ? { network: fakeNetwork } : null;
    },
    get voice() {
      return initialized ? fakeVoice : null;
    }
  },{
    iccId: 222,
    addEventListener: fakeEventListener,
    removeEventListener: function() {},
    getCallWaitingOption: FFOS_RUNTIME.domRequest(true),
    getCallForwardingOption: FFOS_RUNTIME.domRequest(1),
    setCallWaitingOption: FFOS_RUNTIME.domRequest(),
    getCallingLineIdRestriction: FFOS_RUNTIME.domRequest(),
    get data() {
      return initialized ? { network: fakeNetwork2 } : null;
    },
    get voice() {
      return initialized ? fakeVoice2 : null;
    }
  }], true);

}();
