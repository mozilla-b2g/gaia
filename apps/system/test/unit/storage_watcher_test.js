'use strict';

requireApp('system/js/storage_watcher.js');

requireApp('system/test/unit/mock_system_banner.js');
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/shared/test/unit/mocks/mock_dom_request.js');
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

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;
  });

  setup(function() {
    fakeNotif = document.createElement('div');
    fakeNotif.id = 'storage-watcher-container';
    fakeNotif.innerHTML = [
      '<div class="message">',
      '</div>',
      '<div class="available-space">',
      '</div>'
    ].join('');

    document.body.appendChild(fakeNotif);
  });

  teardown(function() {
    DeviceStorageWatcher._container = null;

    fakeNotif.parentNode.removeChild(fakeNotif);
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

    setup(function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');

      DeviceStorageWatcher.init();
      event = {
        type: 'change',
        reason: 'low-disk-space'
      };
      DeviceStorageWatcher.handleEvent(event);

      var freeSpaceRequest = freeSpaceSpy.getCall(0).returnValue;
      freeSpaceRequest.fireSuccess(0);
    });

    test('lowDeviceStorage should be true', function() {
      assert.isTrue(DeviceStorageWatcher._lowDeviceStorage);
    });

    test('should show system banner', function() {
      assert.equal(1, MockSystemBanner.mShowCount);
      assert.equal(
        'low-device-storagefree-space{"value":0,"unit":"byteUnit-B"}',
        MockSystemBanner.mMessage);
      assert.equal('byteUnit-B', lastL10nKeys[0]);
      assert.equal('low-device-storage', lastL10nKeys[1]);
      assert.equal('free-space', lastL10nKeys[2]);
      assert.equal(lastL10nParams[0].value, 0);
      assert.equal(lastL10nParams[0].unit, 'byteUnit-B');
    });

    test('should display the notification', function() {
      assert.isTrue(fakeNotif.classList.contains('displayed'));
      assert.equal(fakeNotif.querySelector('.message').innerHTML,
                   'low-device-storage');
      assert.equal(fakeNotif.querySelector('.available-space').innerHTML,
                   'free-space{"value":0,"unit":"byteUnit-B"}');
    });

    teardown(function() {
      lastL10nKeys = [];
      lastL10nParams = [];
    });
  });

  suite('low device storage, unknown free space', function() {
    var event;

    setup(function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');

      DeviceStorageWatcher.init();
      event = {
        type: 'change',
        reason: 'low-disk-space'
      };
      DeviceStorageWatcher.handleEvent(event);

      var freeSpaceRequest = freeSpaceSpy.getCall(0).returnValue;
      freeSpaceRequest.fireSuccess(undefined);
    });

    test('lowDeviceStorage should be true', function() {
      assert.isTrue(DeviceStorageWatcher._lowDeviceStorage);
    });

    test('should show system banner with unknown space', function() {
      assert.equal(1, MockSystemBanner.mShowCount);
      assert.equal('low-device-storageunknown-free-space',
                   MockSystemBanner.mMessage);
      assert.equal('low-device-storage', lastL10nKeys[0]);
      assert.equal('unknown-free-space', lastL10nKeys[1]);
      assert.equal(lastL10nParams[0], undefined);
    });

    test('should display the notification with unknown space', function() {
      assert.isTrue(fakeNotif.classList.contains('displayed'));
      assert.equal(fakeNotif.querySelector('.message').innerHTML,
                   'low-device-storage');
      assert.equal(fakeNotif.querySelector('.available-space').innerHTML,
                   'unknown-free-space');
    });

    teardown(function() {
      lastL10nKeys = [];
      lastL10nParams = [];
    });
  });

  suite('repeated low device storage notification', function() {
    var event;

    setup(function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');

      DeviceStorageWatcher.init();
      event = {
        type: 'change',
        reason: 'low-disk-space'
      };
      DeviceStorageWatcher.handleEvent(event);

      var freeSpaceRequest = freeSpaceSpy.getCall(0).returnValue;
      freeSpaceRequest.fireSuccess(2048);

      DeviceStorageWatcher.handleEvent(event);

      var freeSpaceRequest1 = freeSpaceSpy.getCall(1).returnValue;
      freeSpaceRequest1.fireSuccess(1024);
    });

    test('lowDeviceStorage should be true', function() {
      assert.isTrue(DeviceStorageWatcher._lowDeviceStorage);
    });

    test('should update free space', function() {
      assert.equal(fakeNotif.querySelector('.available-space').innerHTML,
                   'free-space{"value":1,"unit":"byteUnit-KB"}');
    });
  });

  suite('available device storage', function() {
    var event;

    setup(function() {
      DeviceStorageWatcher.init();
      event = {
        type: 'change',
        reason: 'available-disk-space'
      };
      DeviceStorageWatcher.handleEvent(event);
    });

    test('lowDeviceStorage should be false', function() {
      assert.isTrue(!DeviceStorageWatcher._lowDeviceStorage);
    });

    test('should hide notification', function() {
      assert.isTrue(!fakeNotif.classList.contains('displayed'));
    });
  });

  suite('formatSize helper', function() {
    test('empty size', function() {
      assert.equal(DeviceStorageWatcher.formatSize(), undefined);
    });

    test('NaN', function() {
      assert.equal(DeviceStorageWatcher.formatSize('NaN'), undefined);
    });

    test('bytes', function() {
      var result = DeviceStorageWatcher.formatSize(1);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-B');
    });

    test('KB', function() {
      var result = DeviceStorageWatcher.formatSize(1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-KB');
    });

    test('MB', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-MB');
    });

    test('GB', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-GB');
    });

    test('TB', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-TB');
    });

    test('PB', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024 *
                                                   1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-PB');
    });

    test('EB', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024 *
                                                   1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-EB');
    });

    test('ZB', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024 *
                                                   1024 * 1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-ZB');
    });

    test('YB', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 * 1024 * 1024 *
                                                   1024 * 1024 * 1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-YB');
    });
  });
});
