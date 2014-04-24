var BluetoothHelper = function() {
  var _bluetooth = window.navigator.mozBluetooth;
  var _debug = false;
  var _isReady = false;
  var _callbacks = [];

  var _adapter = null;

  var _ready = function(callback) {
    if (!callback || !_bluetooth) {
      return;
    }

    if (_isReady) {
      callback();
    } else {
      _callbacks.push(callback);
    }
  };

  if (_bluetooth) {
    var req = _bluetooth.getDefaultAdapter();
    req.onsuccess = function() {
      _isReady = true;
      _adapter = req.result;

      _callbacks.forEach(function(callback) {
        callback();
      });
    };

    req.onerror = function() {
      // We can do nothing without default adapter.
      if (_debug) {
        console.log('BluetoothHelper(): connot get default adapter!!!');
      }
    };
  }

  return {
    answerWaitingCall: function() {
      _ready(function() {
        _adapter.answerWaitingCall();
      });
    },
    ignoreWaitingCall: function() {
      _ready(function() {
        _adapter.ignoreWaitingCall();
      });
    },
    toggleCalls: function() {
      _ready(function() {
        _adapter.toggleCalls();
      });
    },
    set onscostatuschanged(callback) {
      _ready(function() {
        _adapter.onscostatuschanged = callback;
      });
    },
    setPairingConfirmation: function(address, confirmed) {
      _ready(function() {
        _adapter.setPairingConfirmation(address, confirmed);
      });
    },
    setPinCode: function(address, pincode) {
      _ready(function() {
        _adapter.setPinCode(address, pincode);
      });
    },
    setPasskey: function(address, key) {
      _ready(function() {
        _adapter.setPasskey(address, key);
      });
    }
  };
};
