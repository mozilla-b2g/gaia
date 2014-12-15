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
  var _v2 = true;

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

  // run callbacks when adapter is ready
  var _processCallbacks = function() {
    if (_adapter) {
      _isReady = true;

      _callbacks.forEach(function(callback) {
        callback();
      });
      // clean up the _callback queue
      _callbacks = [];
    } else {
      // We can do nothing without default adapter.
      console.log('BluetoothHelper(): connot get default adapter yet');
    }
  };

  // API v2 get adapter via bluetooth
  var _fetchAdapterV2 = function() {
    // need time to get bluetooth adapter at first run
    _bluetooth.onattributechanged = function onManagerAttributeChanged(evt) {
      for (var i in evt.attrs) {
        switch (evt.attrs[i]) {
          case 'defaultAdapter':
            console.log('defaultAdapter changed. address:',
              _bluetooth.defaultAdapter.address);
            _adapter = _bluetooth.defaultAdapter;
            _processCallbacks();
            break;
          default:
            break;
        }
      }
    };

    _adapter = _bluetooth.defaultAdapter;
    if (_adapter) {
      _processCallbacks();
    }
  };

  // API v1 get adapter via bluetooth
  var _fetchAdapter = function() {
    var req = _bluetooth.getDefaultAdapter();
    if (req) {
      req.onsuccess = function() {
        var _oldAdapter;
        if (_adapter) {
          _oldAdapter = _adapter;
        }

        _isReady = true;
        _adapter = req.result;

        // Put the callback function of onpairedstatuschanged to the new adapter
        // because the new adapter won't remember those callback function which
        // is registered before. In other word, we get a new adpater after
        // turned on/off Bluetooth. The new adapter have no registered callback.
        if (_oldAdapter && _oldAdapter.onpairedstatuschanged) {
          _adapter.onpairedstatuschanged = _oldAdapter.onpairedstatuschanged;
        }

        _callbacks.forEach(function(callback) {
          callback();
        });
        // clean up the _callback queue
        _callbacks = [];
      };

      req.onerror = function() {
        // We can do nothing without default adapter.
        console.log('BluetoothHelper(): connot get default adapter!!!');
      };
    }
  };

  var _getAdapter = function() {
    if (_v2) {
      _fetchAdapterV2();
    } else {
      _fetchAdapter();
    }
  };

  // init
  if (_bluetooth) {
    // detect API version
    if (typeof(_bluetooth.onattributechanged) === 'undefined') {
      _v2 = false;
    }

    if (_v2) {
      _bluetooth.onadapteradded = function onAdapterAdded(evt) {
        _getAdapter();
      };
    } else {
      _bluetooth.addEventListener('enabled', _getAdapter);
      _bluetooth.addEventListener('adapteradded', _getAdapter);
    }
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
      if (_v2) {
        console.log('getConnectedDevicesByProfile API is deprecated');
        return;
      }

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

    getPairedDevices: function(cb) {
      _ready(function() {
        _handleRequest(_adapter.getPairedDevices(), cb);
      });
    },

    getAddress: function(cb) {
      _ready(function() {
        var address = _adapter.address;
        cb(address);
      });
    },

    setPairingConfirmation: function(address, confirmed) {
      if (_v2) {
        console.log('setPairingConfirmation API is deprecated');
        return;
      }

      _ready(function() {
        _adapter.setPairingConfirmation(address, confirmed);
      });
    },

    setPinCode: function(address, pincode) {
      if (_v2) {
        console.log('setPairingConfirmation API is deprecated');
        return;
      }

      _ready(function() {
        _adapter.setPinCode(address, pincode);
      });
    },

    setPasskey: function(address, key) {
      if (_v2) {
        console.log('setPairingConfirmation API is deprecated');
        return;
      }

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
    },

    set onpairedstatuschanged(callback) {
      if (_v2) {
        console.log('onpairedstatuschanged API is deprecated');
        return;
      }

      _ready(function() {
        _adapter.onpairedstatuschanged = callback;
      });
    },

    v2: _v2, // expose API version for app reference

    // bypass the enable/disable state if works in APIv1
    enable: function() {
      if (_v2) {
        _ready(function() {
          _adapter.enable();
        });
      } else {
        console.log('enable is not support in v1 API!');
      }
    },

    disable: function() {
      if (_v2) {
        _ready(function() {
          _adapter.disable();
        });
      } else {
        console.log('disable is not support in v1 API!');
      }
    }
  };
};
