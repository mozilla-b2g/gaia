/* global Download, DownloadFormatter, DownloadStore, DownloadNotification,
          DownloadHelper, DownloadUI, MocksHelper, MockL10n, NotificationScreen,
          mockMozActivityInstance */
'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_download.js');
requireApp('system/test/unit/mock_download_store.js');
requireApp('system/test/unit/mock_download_ui.js');
requireApp('system/test/unit/mock_download_formatter.js');
requireApp('system/test/unit/mock_download_helper.js');
require('/shared/test/unit/mocks/mock_l20n.js');
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/test/unit/mock_activity.js');

requireApp('system/js/download/download_notification.js');

var mocksForDownloadNotification = new MocksHelper([
  'Download',
  'NotificationScreen',
  'L10n',
  'LazyLoader',
  'MozActivity',
  'DownloadHelper',
  'DownloadFormatter',
  'DownloadUI',
  'DownloadStore'
]).init();

suite('system/DownloadNotification >', function() {
  var ERRORS = {
    NO_MEMORY: 2152857616,
    NO_SDCARD: 2152857618,
    UNMOUNTED_SDCARD: 2152857621
  };

  var notification, realL10n, download, realOnLine, isOnLine;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  mocksForDownloadNotification.attachTestHelpers();

  suiteSetup(function() {
    // This suite checks the life cycle of a download notification
    download = new Download();
    download.resume = function() {};
    realL10n = document.l10n;
    document.l10n = MockL10n;
    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
  });

  function assertUpdatedNotification(download, state) {
    assert.isTrue(NotificationScreen.addNotification.called);

    var args = NotificationScreen.addNotification.args[0];
    var fileName = DownloadFormatter.getFileName(download);
    assert.isTrue(args[0].text.indexOf(fileName) !== -1);
    state = state || download.state;
    assert.equal(args[0].type, 'download-notification-' + state);
  }

  suite('Download whole life cycle', function() {

    setup(function() {
      this.sinon.stub(NotificationScreen, 'addNotification');
      this.sinon.spy(DownloadStore, 'add');
      navigator.onLine = true;
    });

    teardown(function() {
      download.error = null;
    });

    test('Download notification has been created', function(done) {
      notification = new DownloadNotification(download);
      notification.ready.then(() => {
        assert.isTrue(NotificationScreen.addNotification.called);
      }).then(done, done);
    });

    test('The download starts', function(done) {
      notification.state = 'started';
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download);

        assert.isUndefined(
          NotificationScreen.addNotification.args[0][0].noNotify);
      }).then(done, done);
    });

    test('The download continues', function(done) {
      notification.state = 'downloading';
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download);

        assert.isTrue(
          NotificationScreen.addNotification.args[0][0].noNotify);
      }).then(done, done);
    });

    test('The notification was clicked while downloading > Show download list',
         function() {
      notification.onClick();
      assert.equal(mockMozActivityInstance.name, 'configure');
      assert.equal(mockMozActivityInstance.data.target, 'device');
      assert.equal(mockMozActivityInstance.data.section, 'downloads');
    });

    test('The download failed', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError'
      };
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download, 'failed');
        assert.equal(DownloadHelper.methodCalled, 'getFreeSpace');
        assert.isNull(DownloadUI.methodCalled);
      }).then(done, done);
    });

    test('Failed notification was clicked > Show confirmation', function() {
      notification.onClick();
      assert.equal(DownloadUI.methodCalled, 'show');
    });

    test('Download continues downloading', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download);

        assert.isUndefined(
          NotificationScreen.addNotification.args[0][0].noNotify);
      }).then(done, done);
    });

    test('Download was stopped by the user', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download);
      }).then(done, done);
    });

    test('Stopped notification was clicked > Show confirmation', function() {
      notification.onClick();
      assert.equal(DownloadUI.methodCalled, 'show');
    });

    test('Download continues downloading', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.currentBytes = 300;
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download);
        assert.isUndefined(
          NotificationScreen.addNotification.args[0][0].noNotify);
      }).then(done, done);
    });

    test('The download failed because the SD card is missing', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.NO_SDCARD
      };
      DownloadHelper.bytes = 0;
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download, 'failed');
        assert.equal(DownloadUI.methodCalled, 'show');
      }).then(done, done);

      // pretend like the user fixed the issue and move onto the next failure.
      download.state = 'downloading';
      download.currentBytes = 400;
      download.listeners[0]();
    });

    test('The download failed because the SD card is busy', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.UNMOUNTED_SDCARD
      };
      DownloadHelper.bytes = 0;
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download, 'failed');
        assert.equal(DownloadUI.methodCalled, 'show');
      }).then(done, done);

      // pretend like the user fixed the issue and move onto the next failure.
      download.state = 'downloading';
      download.currentBytes = 400;
      download.listeners[0]();
    });

    test('The download failed because of no free memory', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.NO_MEMORY
      };
      DownloadHelper.bytes = 0;
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download, 'failed');
        assert.equal(DownloadUI.methodCalled, 'show');
      }).then(done, done);
    });

    test('Download continues downloading', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.currentBytes = 400;
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download);
        assert.isUndefined(
          NotificationScreen.addNotification.args[0][0].noNotify);
      }).then(done, done);
    });

    test('Download was stopped because the connectivity was lost',
      function(done) {

      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      navigator.onLine = false;
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download, 'downloading');
      }).then(done, done);
    });

    test('Download finishes', function(done) {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'succeeded';
      download.listeners[0]().then(() => {
        assertUpdatedNotification(download);
        assert.ok(DownloadStore.add.calledOnce);
      }).then(done, done);
    });

    test('Finished notification was clicked > Open file', function() {
      notification.onClick(function() {});
      assert.equal(DownloadHelper.methodCalled, 'open');

      assert.isNull(notification.id);
      assert.isNull(notification.download);
      assert.isNull(notification.state);
    });
  });

  suite('Download removed from download list', function() {
    suiteSetup(function() {
      download.listeners = [];
    });

    test('Download notification has been created ', function(done) {
      this.sinon.stub(NotificationScreen, 'addNotification');
      notification = new DownloadNotification(download);
      notification.ready.then(() => {
        sinon.assert.called(NotificationScreen.addNotification);
      }).then(done, done);
    });

    test('The download finalizes (download object is dead on the gecko side) ',
      function() {
      this.sinon.stub(NotificationScreen, 'removeNotification');
      download.state = 'finalized';
      download.listeners[0]();
      assert.isTrue(NotificationScreen.removeNotification.called,
        'Notification should not remain when download is finalized.');
    });

  });

});
