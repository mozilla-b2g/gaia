!function() {

  function MockBluetoothRequest() {

  }
  MockBluetoothRequest.prototype = {
  };

  FFOS_RUNTIME.makeNavigatorShim('mozBluetooth', {
    enabled: true,
    onadapteradded: function() {
      console.log('bluetooth onadapteradded');
    },
    getDefaultAdapter: function() {
      console.log('bluetooth getDefaultAdapter');
      var bluetoothRequest = new MockBluetoothRequest();
      return bluetoothRequest;
    },
    isConnected: function() {
      console.log('bluetooth isConnected');
    }
  });
}();
