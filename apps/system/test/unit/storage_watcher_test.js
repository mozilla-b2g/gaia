'use strict';

requireApp('system/js/storage_watcher.js');

requireApp('system/test/unit/mock_system_banner.js');
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/test/unit/mock_navigator_get_device_storage.js');

var mocksForStorageWatcher = new MocksHelper([
  'SystemBanner',
  'NotificationScreen'
]).init();

suite('system/DeviceStorageWatcher >', function() {
  var realL10n;
  var realNavigatorGetDeviceStorage;
  var fakeNotif;
  var tinyTimeout = 25;
  var lastL10nParams = [];
  var lastL10nKeys = [];

  mocksForStorageWatcher.attachTestHelpers();
  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key, params) {
        lastL10nKeys.push(key);
        if (params) {
          lastL10nParams.push(params);
          return key + JSON.stringify(params);
        }

        return key;
      }
    };

    realNavigatorGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockNavigatorGetDeviceStorage;

    done();
  });

  suiteTeardown(function(done) {
    navigator.mozL10n = realL10n;
    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;

    done();
  });

  setup(function(done) {
    fakeNotif = document.createElement('div');
    fakeNotif.id = 'storage-watcher-container';
    fakeNotif.innerHTML = [
      '<div class="message">',
      '</div>',
      '<div class="available-space">',
      '</div>'
    ].join('');

    document.body.appendChild(fakeNotif);

    done();
  });

  teardown(function(done) {
    setTimeout(function() {
      DeviceStorageWatcher._container = null;

      fakeNotif.parentNode.removeChild(fakeNotif);

      done();
    }, tinyTimeout);
  });

  suite('init', function() {
    setup(function(done) {
      DeviceStorageWatcher.init();
      done();
    });

    test('should bind DOM elements', function(done) {
      assert.equal('storage-watcher-container',
                   DeviceStorageWatcher._container.id);
      assert.equal('message', DeviceStorageWatcher._message.className);
      assert.equal('available-space',
                   DeviceStorageWatcher._availableSpace.className);
      done();
    });

    test('should bind to the click event', function(done) {
      assert.equal(DeviceStorageWatcher.containerClicked.name,
                   DeviceStorageWatcher._container.onclick.name);
      done();
    });

    test('should add change event listener', function(done) {
      assert.equal(typeof DeviceStorageWatcher._appStorage._listeners['change'],
                   'object');
      done();
    });

    test('lowDeviceStorage should be false', function(done) {
      assert.isTrue(!DeviceStorageWatcher._lowDeviceStorage);
      done();
    });
  });

  suite('low device storage', function() {
    var event;

    setup(function(done) {
      DeviceStorageWatcher.init();
      MockNavigatorGetDeviceStorage._freeSpace = 0;
      event = {
        type: 'change',
        reason: 'low-disk-space'
      };
      DeviceStorageWatcher.handleEvent(event);
      done();
    });

    test('lowDeviceStorage should be true', function(done) {
      setTimeout(function() {
        assert.isTrue(DeviceStorageWatcher._lowDeviceStorage);
        done();
      }, tinyTimeout);
    });

    test('should show system banner', function(done) {
      setTimeout(function() {
        assert.equal(1, MockSystemBanner.mShowCount);
        assert.equal(
          'low-device-storagefree-space{"value":0,"unit":"byteUnit-B"}',
          MockSystemBanner.mMessage);
        assert.equal('byteUnit-B', lastL10nKeys[0]);
        assert.equal('low-device-storage', lastL10nKeys[1]);
        assert.equal('free-space', lastL10nKeys[2]);
        assert.equal(lastL10nParams[0].value, 0);
        assert.equal(lastL10nParams[0].unit, 'byteUnit-B');
        done();
      }, tinyTimeout);
    });

    test('should display the notification', function(done) {
      setTimeout(function() {
        assert.isTrue(fakeNotif.classList.contains('displayed'));
        assert.equal(fakeNotif.querySelector('.message').innerHTML,
                     'low-device-storage');
        assert.equal(fakeNotif.querySelector('.available-space').innerHTML,
                     'free-space{"value":0,"unit":"byteUnit-B"}');
        done();
      }, tinyTimeout);
    });

    teardown(function(done) {
      lastL10nKeys = [];
      lastL10nParams = [];
      done();
    });
  });

  suite('low device storage, unknown free space', function() {
    var event;

    setup(function(done) {
      DeviceStorageWatcher.init();
      event = {
        type: 'change',
        reason: 'low-disk-space'
      };
      DeviceStorageWatcher._appStorage._freeSpace = undefined;
      DeviceStorageWatcher.handleEvent(event);
      done();
    });

    test('lowDeviceStorage should be true', function(done) {
      setTimeout(function() {
        assert.isTrue(DeviceStorageWatcher._lowDeviceStorage);
        done();
      }, tinyTimeout);
    });

    test('should show system banner with unknown space', function(done) {
      setTimeout(function() {
        assert.equal(1, MockSystemBanner.mShowCount);
        assert.equal('low-device-storageunknown-free-space',
                     MockSystemBanner.mMessage);
        assert.equal('low-device-storage', lastL10nKeys[0]);
        assert.equal('unknown-free-space', lastL10nKeys[1]);
        assert.equal(lastL10nParams[0], undefined);
        done();
      }, tinyTimeout);
    });

    test('should display the notification with unknown space', function(done) {
      setTimeout(function() {
        assert.isTrue(fakeNotif.classList.contains('displayed'));
        assert.equal(fakeNotif.querySelector('.message').innerHTML,
                     'low-device-storage');
        assert.equal(fakeNotif.querySelector('.available-space').innerHTML,
                     'unknown-free-space');
        done();
      }, tinyTimeout);
    });

    teardown(function(done) {
      lastL10nKeys = [];
      lastL10nParams = [];
      done();
    });
  });

  suite('repeated low device storage notification', function() {
    var event;

    setup(function(done) {
      DeviceStorageWatcher.init();
      event = {
        type: 'change',
        reason: 'low-disk-space'
      };
      DeviceStorageWatcher.handleEvent(event);
      DeviceStorageWatcher._appStorage._freeSpace = 1024;
      DeviceStorageWatcher.handleEvent(event);
      done();
    });

    test('lowDeviceStorage should be true', function(done) {
      setTimeout(function() {
        assert.isTrue(DeviceStorageWatcher._lowDeviceStorage);
        done();
      }, tinyTimeout * 2);
    });

    test('should update free space', function(done) {
      setTimeout(function() {
        assert.equal(fakeNotif.querySelector('.available-space').innerHTML,
                     'free-space{"value":1,"unit":"byteUnit-KB"}');
        done();
      }, tinyTimeout * 2);
    });
  });

  suite('available device storage', function() {
    var event;

    setup(function(done) {
      DeviceStorageWatcher.init();
      event = {
        type: 'change',
        reason: 'available-disk-space'
      };
      DeviceStorageWatcher.handleEvent(event);
      done();
    });

    test('lowDeviceStorage should be false', function(done) {
      setTimeout(function() {
        assert.isTrue(!DeviceStorageWatcher._lowDeviceStorage);
        done();
      }, tinyTimeout);
    });

    test('should hide notification', function(done) {
      setTimeout(function() {
        assert.isTrue(!fakeNotif.classList.contains('displayed'));
        done();
      }, tinyTimeout);
    });
  });

  suite('formatSize helper', function() {
    test('empty size', function(done) {
      assert.equal(DeviceStorageWatcher.formatSize(), undefined);
      done();
    });

    test('NaN', function(done) {
      assert.equal(DeviceStorageWatcher.formatSize('NaN'), undefined);
      done();
    });

    test('bytes', function(done) {
      var result = DeviceStorageWatcher.formatSize(1);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-B');
      done();
    });

    test('KB', function(done) {
      var result = DeviceStorageWatcher.formatSize(1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-KB');
      done();
    });

    test('MB', function(done) {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-MB');
      done();
    });

    test('GB', function(done) {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-GB');
      done();
    });

    test('TB', function(done) {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-TB');
      done();
    });

    test('PB', function(done) {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024 *
                                                   1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-PB');
      done();
    });

    test('EB', function(done) {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024 *
                                                   1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-EB');
      done();
    });

    test('ZB', function(done) {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024 *
                                                   1024 * 1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-ZB');
      done();
    });

    test('YB', function(done) {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024 *
                                                   1024 * 1024 * 1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-YB');
      done();
    });
  });
});
