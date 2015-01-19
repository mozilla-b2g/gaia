/* global DeviceStorageWatcher, MocksHelper, MockL10n,
          MockNavigatorGetDeviceStorage, MockSystemBanner */
'use strict';

requireApp('system/js/device_storage_watcher.js');

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_system_banner.js');
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/shared/test/unit/mocks/mock_event_target.js');
requireApp('system/shared/test/unit/mocks/mock_dom_request.js');
requireApp('system/test/unit/mock_navigator_get_device_storage.js');

var mocksForStorageWatcher = new MocksHelper([
  'SystemBanner',
  'NotificationScreen',
  'LazyLoader',
  'Service'
]).init();

suite('system/DeviceStorageWatcher >', function() {
  var realL10n;
  var realNavigatorGetDeviceStorage;
  var fakeNotif;

  mocksForStorageWatcher.attachTestHelpers();
  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

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
      '<div data-icon="storage-circle"></div>',
      '<div class="title-container"></div>',
      '<div class="detail"></div>'
    ].join('');

    document.body.appendChild(fakeNotif);
  });

  teardown(function() {
    DeviceStorageWatcher._container = null;

    fakeNotif.parentNode.removeChild(fakeNotif);
  });

  suite('init', function() {
    setup(function(done) {
      DeviceStorageWatcher.start();
      done();
    });

    test('should bind DOM elements', function(done) {
      assert.equal('storage-watcher-container',
                   DeviceStorageWatcher._container.id);
      assert.equal('title-container', DeviceStorageWatcher._message.className);
      assert.equal('detail',
                   DeviceStorageWatcher._availableSpace.className);
      done();
    });

    test('should bind to the click event', function(done) {
      assert.equal(DeviceStorageWatcher.containerClicked.name,
                   DeviceStorageWatcher._container.onclick.name);
      done();
    });

    test('should add change event listener', function(done) {
      assert.equal(typeof DeviceStorageWatcher._appStorage._listeners.change,
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
    var getSpy;

    setup(function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      getSpy = this.sinon.spy(navigator.mozL10n, 'get');

      DeviceStorageWatcher.start();
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
      assert.deepEqual(['low-device-storage', {
        id: 'free-space',
        args: { value: 0, unit: 'byteUnit-B'}
      }], MockSystemBanner.mMessage);
    });

    test('should display the notification', function() {
      assert.isTrue(fakeNotif.classList.contains('displayed'));
      assert.equal(fakeNotif.querySelector('.title-container')
        .getAttribute('data-l10n-id'), 'low-device-storage');
      var l10nAttrs = navigator.mozL10n.getAttributes(
        fakeNotif.querySelector('.detail'));
      assert.equal(l10nAttrs.id, 'free-space');
      assert.deepEqual(l10nAttrs.args, {
        value: 0,
        unit: 'byteUnit-B'
      });
    });

    teardown(function() {
      navigator.mozL10n.get.restore();
    });
  });

  suite('low device storage, unknown free space', function() {
    var event;
    var getSpy;

    setup(function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');
      getSpy = this.sinon.spy(navigator.mozL10n, 'get');

      DeviceStorageWatcher.start();
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
      assert.deepEqual(['low-device-storage', 'unknown-free-space'],
                   MockSystemBanner.mMessage);
    });

    test('should display the notification with unknown space', function() {
      assert.isTrue(fakeNotif.classList.contains('displayed'));
      assert.equal(fakeNotif.querySelector('.title-container').
        getAttribute('data-l10n-id'), 'low-device-storage');
      assert.equal(
        fakeNotif.querySelector('.detail').getAttribute('data-l10n-id'),
        'unknown-free-space');
    });

    teardown(function() {
      navigator.mozL10n.get.restore();
    });
  });

  suite('repeated low device storage notification', function() {
    var event;

    setup(function() {
      var mockDeviceStorage = MockNavigatorGetDeviceStorage();
      var freeSpaceSpy = this.sinon.spy(mockDeviceStorage, 'freeSpace');

      DeviceStorageWatcher.start();
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
      var l10nAttrs = navigator.mozL10n.getAttributes(
        fakeNotif.querySelector('.detail'));
      assert.equal(l10nAttrs.id, 'free-space');
      assert.deepEqual(l10nAttrs.args, {
        value: 1,
        unit: 'byteUnit-KB'
      });
    });
  });

  suite('available device storage', function() {
    var event;

    setup(function() {
      DeviceStorageWatcher.start();
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

    test('KB with decimal (round down)', function() {
      var result = DeviceStorageWatcher.formatSize(1024 + 511);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-KB');
    });

    test('KB with decimal (round up)', function() {
      var result = DeviceStorageWatcher.formatSize(1024 + 512);
      assert.equal(result.size, 2);
      assert.equal(result.unit, 'byteUnit-KB');
    });

    test('MB', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-MB');
    });

    test('MB with decimal (lower than 1K)', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 + 512);
      assert.equal(result.size, 1);
      assert.equal(result.unit, 'byteUnit-MB');
    });

    test('MB with decimal (0.5MB)', function() {
      var result = DeviceStorageWatcher.formatSize(1024 * 1024 + 512 * 1024);
      assert.equal(result.size, 1.5);
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
