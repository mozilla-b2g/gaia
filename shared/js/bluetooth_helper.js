/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* exported BluetoothHelper */

'use strict';

var BluetoothHelper = function() {
  var profiles = {
    'HFP': 0x111E,
    'A2DP': 0x110D
  };

  var _bluetooth = window.navigator.mozBluetooth;
  var _isReady = false;
  var _callbacks = [];

  var _adapter = null;
  var _v2 = false;

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

  var _handleRequest = function(request, callback, errorcb) {
    request.onsuccess = function() {
      if (callback) {
        callback(request.result);
      }
    };

    request.onerror = function() {
      console.log('Error handling bluetooth request');
      if (errorcb) {
        errorcb();
      }
    };
  };

  var _getAdapter = function() {
    if (_v2) {
      _adapter = _bluetooth.defaultAdapter;
      if (_adapter) {
        _isReady = true;

        _callbacks.forEach(function(callback) {
          callback();
        });
      } else {
        // We can do nothing without default adapter.
        console.log('BluetoothHelper(): connot get default adapter!!!');
      }
    } else {
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
        console.log('BluetoothHelper(): connot get default adapter!!!');
      };
    }
  };

  // init
  if (_bluetooth) {
    if (_bluetooth.defaultAdapter) {
      _v2 = true;
    }
    _bluetooth.addEventListener('enabled', _getAdapter);
    _bluetooth.addEventListener('adapteradded', _getAdapter);
    _getAdapter();
  }

  return {
    profiles: profiles,

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

    getConnectedDevicesByProfile: function(profileID, cb) {
      _ready(function() {
        _handleRequest(_adapter.getConnectedDevices(profileID), cb);
      });
    },

    connectSco: function(cb) {
      _ready(function() {
        _handleRequest(_adapter.connectSco(), cb);
      });
    },

    disconnectSco: function(cb) {
      _ready(function() {
        _handleRequest(_adapter.disconnectSco(), cb);
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
    },

    set onhfpstatuschanged(callback) {
      _ready(function() {
        _adapter.onhfpstatuschanged = callback;
      });
    },

    set onscostatuschanged(callback) {
      _ready(function() {
        _adapter.onscostatuschanged = callback;
      });
    }
  };
};
