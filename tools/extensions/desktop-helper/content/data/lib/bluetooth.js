!function() {

  function debug(str) {
    //dump('Bluetooth : ' + str + '\n');
  }

  function MockBluetoothRequest() {
  }

  MockBluetoothRequest.prototype = {
  };

  FFOS_RUNTIME.makeNavigatorShim('mozBluetooth', {
    enabled: true,
    addEventListener: function(type, callback, bubble) {},
    onenabled: function(event) {},
    ondisabled: function(event) {},
    onadapteradded: function() {
      debug('onadapteradded');
    },
    getDefaultAdapter: FFOS_RUNTIME.domRequest({
      ondevicefound: function() {},
      setDiscoverable: function() {},
      getPairedDevices: FFOS_RUNTIME.domRequest([]),
      startDiscovery: FFOS_RUNTIME.domRequest(),
      name: 'I like blue',
      setName: FFOS_RUNTIME.domRequest()
    }),
    isConnected: function() {
      debug('isConnected');
    }
  });
}();
