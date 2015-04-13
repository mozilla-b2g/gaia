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
require('/shared/test/unit/mocks/mock_l10n.js');
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
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
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

    test('Download notification has been created', function() {
      notification = new DownloadNotification(download);
      assert.isTrue(NotificationScreen.addNotification.called);
    });

    test('The download starts', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.listeners[0]();
      assertUpdatedNotification(download);

      sinon.assert.calledWithMatch(NotificationScreen.addNotification, {
        noNotify: true
      });
    });

    test('The notification was clicked while downloading > Show download list',
         function() {
      notification.onClick();
      assert.equal(mockMozActivityInstance.name, 'configure');
      assert.equal(mockMozActivityInstance.data.target, 'device');
      assert.equal(mockMozActivityInstance.data.section, 'downloads');
    });

    test('The download failed', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError'
      };
      download.listeners[0]();
      assertUpdatedNotification(download, 'failed');
      assert.equal(DownloadHelper.methodCalled, 'getFreeSpace');
      assert.isNull(DownloadUI.methodCalled);
    });

    test('Failed notification was clicked > Show confirmation', function() {
      notification.onClick();
      assert.equal(DownloadUI.methodCalled, 'show');
    });

    test('Download continues downloading', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.listeners[0]();
      assertUpdatedNotification(download);

      sinon.assert.calledWithMatch(NotificationScreen.addNotification, {
        noNotify: true
      });
    });

    test('Download was stopped by the user', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.listeners[0]();
      assertUpdatedNotification(download);
    });

    test('Stopped notification was clicked > Show confirmation', function() {
      notification.onClick();
      assert.equal(DownloadUI.methodCalled, 'show');
    });

    test('Download continues downloading', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.currentBytes = 300;
      download.listeners[0]();
      assertUpdatedNotification(download);

      sinon.assert.calledWithMatch(NotificationScreen.addNotification, {
        noNotify: true
      });
    });

    test('The download failed because the SD card is missing', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.NO_SDCARD
      };
      DownloadHelper.bytes = 0;
      download.listeners[0]();
      assertUpdatedNotification(download, 'failed');
      assert.equal(DownloadUI.methodCalled, 'show');

      // pretend like the user fixed the issue and move onto the next failure.
      download.state = 'downloading';
      download.currentBytes = 400;
      download.listeners[0]();
    });

    test('The download failed because the SD card is busy', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.UNMOUNTED_SDCARD
      };
      DownloadHelper.bytes = 0;
      download.listeners[0]();
      assertUpdatedNotification(download, 'failed');
      assert.equal(DownloadUI.methodCalled, 'show');

      // pretend like the user fixed the issue and move onto the next failure.
      download.state = 'downloading';
      download.currentBytes = 400;
      download.listeners[0]();
    });

    test('The download failed because of no free memory', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.NO_MEMORY
      };
      DownloadHelper.bytes = 0;
      download.listeners[0]();
      assertUpdatedNotification(download, 'failed');
      assert.equal(DownloadUI.methodCalled, 'show');
    });

    test('Download continues downloading', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'downloading';
      download.currentBytes = 400;
      download.listeners[0]();
      assertUpdatedNotification(download);

      sinon.assert.calledWithMatch(NotificationScreen.addNotification, {
        noNotify: true
      });
    });

    test('Download was stopped because the connectivity was lost', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'stopped';
      navigator.onLine = false;
      download.listeners[0]();
      assertUpdatedNotification(download, 'downloading');
    });

    test('Download finishes', function() {
      assert.isFalse(NotificationScreen.addNotification.called);
      download.state = 'succeeded';
      download.listeners[0]();
      assertUpdatedNotification(download);
      assert.ok(DownloadStore.add.calledOnce);
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

    test('Download notification has been created ', function() {
      this.sinon.stub(NotificationScreen, 'addNotification');
      notification = new DownloadNotification(download);
      sinon.assert.called(NotificationScreen.addNotification);
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
