define(function() {
  'use strict';

  function debug(str) {
    dump('DeviceStorage: ' + str + '\n');
  }


  function save(uid, cmd, storage, blob, filename, registerDownload) {
    // For the download manager, we want to avoid the composite storage
    var deviceStorage = navigator.getDeviceStorage(storage);

    if (!deviceStorage) {
      self.sendMessage(uid, cmd, [false, 'no-device-storage', null, false]);
      return;
    }

    var req = deviceStorage.addNamed(blob, filename);

    req.onerror = function() {
      self.sendMessage(uid, cmd, [false, req.error.name, null, false]);
    };

    req.onsuccess = function(e) {
      var prefix = '';

      if (typeof window.IS_GELAM_TEST !== 'undefined') {
        prefix = 'TEST_PREFIX/';
      }

      var savedPath = prefix + e.target.result;

      var registering = false;
      if (registerDownload) {
        var downloadManager = navigator.mozDownloadManager;
        console.warn('have downloadManager?', !!downloadManager,
                      'have adoptDownload?', downloadManager && !!downloadManager.adoptDownload);
        if (downloadManager && downloadManager.adoptDownload) {
          try {
            var fullPath = e.target.result;
            var firstSlash = fullPath.indexOf('/', 2); // ignore leading /
            var storageName = fullPath.substring(1, firstSlash); // eat 1st /
            var storagePath = fullPath.substring(firstSlash + 1);
            console.log('adopting download', deviceStorage.storageName,
                        e.target.result);
            registering = true;
            downloadManager.adoptDownload({
              totalBytes: blob.size,
              // There's no useful URL we can provide; anything would be an
              // internal URI scheme that we can't service.
              url: '',
              storageName: storageName,
              storagePath: storagePath,
              contentType: blob.type,
              // The time we started isn't inherently interesting given that the
              // entirety of the file appears instantaneously to the download
              // manager, now is good enough.
              startTime: new Date(Date.now()),
            }).then(function() {
              console.log('registered download with download manager');
              self.sendMessage(uid, cmd, [true, null, savedPath, true]);
            }, function() {
              console.warn('failed to register download with download manager');
              self.sendMessage(uid, cmd, [true, null, savedPath, false]);
            });
          } catch (ex) {
            console.error('Problem adopting download!:', ex, '\n', ex.stack);
          }
        } else {
          console.log('download manager not available, not registering.');
        }
      } else {
        console.log('do not want to register download');
      }

      // Bool success, String err, String filename
      if (!registering) {
        self.sendMessage(uid, cmd, [true, null, savedPath, false]);
      }
    };
  }

  var self = {
    name: 'devicestorage',
    sendMessage: null,
    process: function(uid, cmd, args) {
      debug('process ' + cmd);
      switch (cmd) {
        case 'save':
          save(uid, cmd, args[0], args[1], args[2], args[3]);
          break;
      }
    }
  };
  return self;
});
