var BluetoothHelper = function() {
  var _bluetooth = window.navigator.mozBluetooth;
  var _isReady = false;
  var _callbacks = [];

  var _adapter = null;

  var _ready = function(callback) {
    if (!callback)
      return;

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
    };
  }

  return {
    answerWaitingCall: function() {
      if (!_bluetooth)
        return;

      _ready(function() {
        _adapter.answerWaitingCall();
      });
    },
    ignoreWaitingCall: function() {
      if (!_bluetooth)
        return;

      _ready(function() {
        _adapter.ignoreWaitingCall();
      });
    },
    toggleCalls: function() {
      if (!_bluetooth)
        return;

      _ready(function() {
        _adapter.toggleCalls();
      });
    }
  };
};
