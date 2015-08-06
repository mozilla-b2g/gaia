/* global MockL10n, MocksHelper, MockDownload, DownloadItem,
          DownloadFormatter */

'use strict';

require('/shared/js/download/download_formatter.js');
require('/shared/test/unit/mocks/mock_download_formatter.js');
require('/shared/test/unit/mocks/mock_download.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('settings/js/downloads/download_item.js');
requireApp('sms/test/unit/mock_utils.js');

var mocksHelperForDownload = new MocksHelper([
  'DownloadFormatter'
]);

suite('Download item', function() {
  var realL10n, realOnLine, isOnLine;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  mocksHelperForDownload.attachTestHelpers();

  suiteSetup(function() {
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
    realL10n = null;
    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
  });

  suite(' > create', function() {
    var downloadMock, downloadElement;
    setup(function() {
      downloadMock = new MockDownload({
        totalBytes: 1000,
        currentBytes: 500,
        state: 'downloading'
      });
      downloadElement = DownloadItem.create(downloadMock);
    });

    teardown(function() {
      downloadMock = null;
      downloadElement = null;
    });
    test(' > check dataset', function() {
      // Check info in LI element
      assert.equal(downloadElement.dataset.url, downloadMock.url);
      assert.equal(downloadElement.dataset.state, downloadMock.state);
      assert.equal(downloadElement.id, downloadMock.id);
      assert.equal(downloadElement.dataset.id, downloadMock.id);
    });

    test(' > check structure', function() {
      // Check structure in LI element
      assert.equal(downloadElement.tagName, 'LI');
      // Need to specify the state, due to all styles are based on this.
      assert.equal(downloadElement.dataset.state, 'downloading');
      var infoElement = downloadElement.querySelector('.info');
      assert.ok(infoElement);
      var fileNameElement = downloadElement.querySelector('.fileName');
      assert.ok(fileNameElement);
      var progress = downloadElement.querySelector('progress');
      assert.ok(progress);
    });

    test(' > check progress', function() {
      var progress = downloadElement.querySelector('progress');
      assert.ok(progress.value);
    });
  });

  suite(' > update', function() {
    var downloadMock, downloadElement, l10nSpy, fileFormatterSpy;
    setup(function() {
      downloadMock = new MockDownload({
        state: 'downloading'
      });
      downloadElement = DownloadItem.create(downloadMock);
      l10nSpy = this.sinon.spy(navigator.mozL10n, 'setAttributes');
      fileFormatterSpy = this.sinon.spy(DownloadFormatter, 'getTotalSize');
      navigator.onLine = true;
    });

    teardown(function() {
      downloadMock = null;
      downloadElement = null;
    });

    test(' > from downloading to stopped by the user', function() {
      var downloadPaused = new MockDownload({
        state: 'stopped'
      });
      DownloadItem.refresh(downloadElement, downloadPaused);
      assert.ok(l10nSpy.called);
      var l10nParams = l10nSpy.args[0][2];
      assert.equal(l10nParams.status, 'download-stopped');
    });

    test(' > from downloading to stopped because of connectivity was lost',
         function() {
      var downloadPaused = new MockDownload({
        state: 'stopped'
      });
      navigator.onLine = false;
      DownloadItem.refresh(downloadElement, downloadPaused);
      assert.ok(l10nSpy.called);
      assert.ok(fileFormatterSpy.called);
      var l10nParams = l10nSpy.args[0][2];
      assert.equal(l10nParams.partial,
                   DownloadFormatter.getDownloadedSize(downloadPaused));
      assert.equal(l10nParams.total,
                   DownloadFormatter.getTotalSize(downloadPaused));
    });

    test(' > from downloading to failed', function() {
      var downloadPaused = new MockDownload({
        state: 'stopped',
        error: {}
      });
      DownloadItem.refresh(downloadElement, downloadPaused);
      assert.ok(l10nSpy.called);
      var l10nParams = l10nSpy.args[0][2];
      assert.equal(l10nParams.status, 'download-failed');
    });

    test(' > from downloading to succeeded', function() {
      var downloadPaused = new MockDownload({
        state: 'succeeded'
      });
      DownloadItem.refresh(downloadElement, downloadPaused);

      assert.ok(fileFormatterSpy.called);
      assert.ok(l10nSpy.called);

      var l10nParams = l10nSpy.args[0][2];
      assert.equal(
        l10nParams.status,
        DownloadFormatter.getTotalSize(downloadPaused)
      );
    });
  });
});


