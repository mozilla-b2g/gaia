define(function() {
  'use strict';

  function debug(str) {
    dump('DeviceStorage: ' + str + '\n');
  }


  function save(uid, cmd, storage, blob, filename) {
    var deviceStorage = navigator.getDeviceStorage(storage);

    if (!deviceStorage) {
      self.sendMessage(uid, cmd, [false, 'no-device-storage']);
      return;
    }

    var req = deviceStorage.addNamed(blob, filename);

    req.onerror = function() {
      self.sendMessage(uid, cmd, [false, req.error.name]);
    };

    req.onsuccess = function(e) {
      var prefix = '';

      if (typeof window.IS_GELAM_TEST !== 'undefined') {
        prefix = 'TEST_PREFIX/';
      }

      // Bool success, String err, String filename
      self.sendMessage(uid, cmd, [true, null, prefix + e.target.result]);
    };
  }

  var self = {
    name: 'devicestorage',
    sendMessage: null,
    process: function(uid, cmd, args) {
      debug('process ' + cmd);
      switch (cmd) {
        case 'save':
          save(uid, cmd, args[0], args[1], args[2]);
          break;
      }
    }
  };
  return self;
});
