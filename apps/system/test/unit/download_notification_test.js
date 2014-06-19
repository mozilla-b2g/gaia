'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_download.js');
requireApp('system/test/unit/mock_download_store.js');
requireApp('system/test/unit/mock_download_ui.js');
requireApp('system/test/unit/mock_download_formatter.js');
requireApp('system/test/unit/mock_download_helper.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_statusbar.js');

requireApp('system/js/download/download_notification.js');

var mocksForDownloadNotification = new MocksHelper([
  'StatusBar',
  'Download',
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

  function assertUpdatedNotification(detail, download, state) {
    var fileName = DownloadFormatter.getFileName(download);
    assert.isTrue(detail.text.indexOf(fileName) !== -1);
    state = state || download.state;
    assert.equal(detail.type, 'download-notification-' + state);
  }

  suite('Download whole life cycle', function() {
    var equeue, stubDispatch;

    setup(function() {
      this.sinon.spy(DownloadStore, 'add');
      navigator.onLine = true;
      equeue = [];
      /*jshint unused:false */
      stubDispatch = this.sinon.stub(window, 'dispatchEvent',
      function(e) {
        equeue.push(e);
      });
      /*jshint unused:false */
      notification = new DownloadNotification(download);
    });

    teardown(function() {
      stubDispatch.restore();
      equeue.length = 0;
      download.error = null;
    });

    test('Download notification has been created', function() {
      assert.equal(equeue.length, 1);
      assert.isTrue((function(e) {
        return 'notification-add' === e.type;
      })(equeue[0]));
    });

    test('The download starts', function() {
      assert.equal(equeue.length, 1);
      download.state = 'downloading';
      download.onstatechange();
      assert.equal(equeue.length, 2);

      assert.isTrue((function(e) {
        return 'notification-add' === e.type;
      })(equeue[0]));
      assert.isTrue((function(e) {
        return 'notification-add' === e.type;
      })(equeue[1]));

      // It would trigger two adding: 1. for creating, 2. for statechange
      assertUpdatedNotification(equeue[1].detail, download);
    });

    test('The notification was clicked while downloading > Show download list',
         function() {
      notification.onClick();
      assert.equal(mockMozActivityInstance.name, 'configure');
      assert.equal(mockMozActivityInstance.data.target, 'device');
      assert.equal(mockMozActivityInstance.data.section, 'downloads');
    });

    test('The download failed', function() {
      // started (creation) -> downloading -> stopped
      download.state = 'downloading';
      download.onstatechange();

      download.state = 'stopped';
      download.error = {
        name: 'DownloadError'
      };
      download.onstatechange();

      assert.equal(equeue.length, 3);
      assert.isTrue((function(e) {
        return 'notification-add' === e.type;
      })(equeue[0]));
      assertUpdatedNotification(equeue[2].detail, download, 'failed');

      assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      assert.equal(DownloadHelper.methodCalled, 'getFreeSpace');
      assert.isNull(DownloadUI.methodCalled);
    });

    test('Failed notification was clicked > Show confirmation', function() {
      notification.onClick();
      assert.equal(DownloadUI.methodCalled, 'show');
    });

    test('Download continues downloading', function() {
      // started (creation) -> stopped -> downloading
      download.state = 'stopped';
      download.onstatechange();
      download.state = 'downloading';
      download.onstatechange();

      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download);
      assert.equal(equeue[2].detail.noNotify, true);
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      assert.isUndefined(MockStatusBar.wasMethodCalled['decSystemDownloads']);
    });

    test('Download was stopped by the user', function() {
      // started (creation) -> downloading -> stopped
      download.state = 'downloading';
      download.onstatechange();
      download.state = 'stopped';
      download.onstatechange();

      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download);
      // started -> downloading: inc
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      // downloading -> stopped: dec
      assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
    });

    test('Stopped notification was clicked > Show confirmation', function() {
      notification.onClick();
      assert.equal(DownloadUI.methodCalled, 'show');
    });

    test('Download continues downloading', function() {
      // started (creation) -> stopped -> downloading
      download.state = 'stopped';
      download.onstatechange();
      download.state = 'downloading';
      download.currentBytes = 300;
      download.onstatechange();

      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download);
      assert.equal(equeue[2].detail.noNotify, true);
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      assert.isUndefined(MockStatusBar.wasMethodCalled['decSystemDownloads']);
    });

    test('The download failed because the SD card is missing', function() {
      // started (creation) -> downloading -> stopped
      download.state = 'downloading';
      download.onstatechange();
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.NO_SDCARD
      };
      DownloadHelper.bytes = 0;
      download.onstatechange();
      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download, 'failed');
      // started -> downloading: inc
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      // downloading -> stopped: dec
      assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      assert.equal(DownloadUI.methodCalled, 'show');

      // pretend like the user fixed the issue and move onto the next failure.
      download.state = 'downloading';
      download.currentBytes = 400;
      download.onstatechange();
    });

    test('The download failed because the SD card is busy', function() {
      // started (creation) -> downloading -> stopped
      download.state = 'downloading';
      download.onstatechange();
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.UNMOUNTED_SDCARD
      };
      DownloadHelper.bytes = 0;
      download.onstatechange();
      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download, 'failed');
      // started -> downloading: inc
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      // downloading -> stopped: dec
      assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      assert.equal(DownloadUI.methodCalled, 'show');

      // pretend like the user fixed the issue and move onto the next failure.
      download.state = 'downloading';
      download.currentBytes = 400;
      download.onstatechange();
    });

    test('The download failed because of no free memory', function() {
      // started (creation) -> downloading -> stopped
      download.state = 'downloading';
      download.onstatechange();
      download.state = 'stopped';
      download.error = {
        name: 'DownloadError',
        message: ERRORS.NO_MEMORY
      };
      DownloadHelper.bytes = 0;
      download.onstatechange();
      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download, 'failed');
      // started -> downloading: inc
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      // downloading -> stopped: dec
      assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
      assert.equal(DownloadUI.methodCalled, 'show');
    });

    test('Download continues downloading', function() {
      // started (creation) -> stopped -> downloading
      download.state = 'stoppped';
      download.onstatechange();
      download.state = 'downloading';
      download.currentBytes = 400;
      download.onstatechange();
      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download);
      assert.equal(equeue[2].detail.noNotify, true);
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      assert.isUndefined(MockStatusBar.wasMethodCalled['decSystemDownloads']);
    });

    test('Download was stopped because the connectivity was lost', function() {
      // started (creation) -> downloading -> stopped
      download.state = 'downloading';
      download.onstatechange();
      download.state = 'stopped';
      navigator.onLine = false;
      download.onstatechange();
      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download, 'downloading');
      // started -> downloading: inc
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      // downloading -> stopped: dec
      assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
    });

    test('Download finishes', function() {
      // started (creation) -> downloading -> successed
      download.state = 'downloading';
      download.onstatechange();
      download.state = 'succeeded';
      download.onstatechange();
      assert.equal(equeue.length, 3);
      assertUpdatedNotification(equeue[2].detail, download);
      assert.ok(DownloadStore.add.calledOnce);
      // started -> downloading: inc
      assert.ok(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      // downloading -> stopped: dec
      assert.ok(MockStatusBar.wasMethodCalled['decSystemDownloads']);
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

    setup(function() {});

    test('Download notification has been created ', function() {
      /*jshint unused:false */
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
      notification = new DownloadNotification(download);
      assert.isTrue(stubDispatch.called);
      assert.isUndefined(MockStatusBar.wasMethodCalled['incSystemDownloads']);
      assert.isUndefined(MockStatusBar.wasMethodCalled['decSystemDownloads']);
    });

    test('The download finalizes (download object is dead on the gecko side) ',
      function() {
      var equeue = [];
      /*jshint unused:false */
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent', function(e) {
        equeue.push(e);
      });
      notification = new DownloadNotification(download);
      download.state = 'finalized';
      download.onstatechange();

      // start (creation) -> finalized
      assert.equal(equeue.length, 2);
      assert.equal(equeue[1].type, 'notification-remove');
      assert.isTrue(equeue[1].detail
        .indexOf(DownloadFormatter.getUUID(download)) !== -1);

      assert.isNull(notification.id);
      assert.isNull(notification.download);
      assert.isNull(notification.state);
    });

  });

});
