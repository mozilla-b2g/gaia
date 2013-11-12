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
    onadapteradded: function() {
      debug('onadapteradded');
    },
    getDefaultAdapter: function() {
      debug('getDefaultAdapter');
      var bluetoothRequest = new MockBluetoothRequest();
      return bluetoothRequest;
    },
    isConnected: function() {
      debug('isConnected');
    }
  });
}();
