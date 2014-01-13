
'use strict';

require('/shared/test/unit/mocks/mock_download.js');
requireApp('settings/test/unit/mock_l10n.js');
require('/shared/js/download/download_formatter.js');


suite('DownloadFormatter', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  var l10nSpy;
  setup(function() {
    l10nSpy = this.sinon.spy(navigator.mozL10n, 'get');
  });

  teardown(function() {
    l10nSpy = null;
  });

  test(' getFormattedSize KB', function() {
    var bytes = 1024 * 1.5; // 1.5 KB
    DownloadFormatter.getFormattedSize(bytes);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-KB');
  });

  test(' getFormattedSize MB', function() {
    var bytes = 1024 * 1024 * 999; // 999 MB
    DownloadFormatter.getFormattedSize(bytes);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 999);
    assert.equal(params.unit, 'byteUnit-MB');
  });

  test(' getPercentage', function() {
    var mockDownload = new MockDownload({
      totalBytes: 1024 * 100,
      currentBytes: 1024 * 50
    });
    var percentage = DownloadFormatter.getPercentage(mockDownload);
    assert.equal(percentage, 50);
  });

  test(' getFileName', function() {
    var path = '/mnt/sdcard/nameFile.mp3';
    var mockDownload = new MockDownload(
      {
        path: path
      }
    );
    assert.equal(DownloadFormatter.getFileName(mockDownload), 'nameFile.mp3');
  });

  test(' getTotalSize KB', function() {
  var bytes = 1024 * 1.5; // 1.5 KB
    var mockDownload = new MockDownload(
      {
        totalBytes: bytes
      }
    );
    DownloadFormatter.getTotalSize(mockDownload);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-KB');
  });

  test(' getTotalSize MB', function() {
    var bytes = 1024 * 1024 * 1.5; // 1.5 MB
    var mockDownload = new MockDownload(
      {
        totalBytes: bytes
      }
    );
    DownloadFormatter.getTotalSize(mockDownload);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-MB');
  });

  test(' getTotalSize GB', function() {
    var bytes = 1024 * 1024 * 1024 * 1.5; // 1.5 GB
    var mockDownload = new MockDownload(
      {
        totalBytes: bytes
      }
    );
    DownloadFormatter.getTotalSize(mockDownload);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-GB');
  });

  test(' getTotalSize TB', function() {
    var bytes = 1024 * 1024 * 1024 * 1024 * 1.5; // 1.5 TB
    var mockDownload = new MockDownload(
      {
        totalBytes: bytes
      }
    );
    DownloadFormatter.getTotalSize(mockDownload);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-TB');
  });

  test(' getDownloadedSize KB', function() {
    var bytes = 1024 * 1.5; // 1.5 KB
    var mockDownload = new MockDownload(
      {
        currentBytes: bytes
      }
    );
    DownloadFormatter.getDownloadedSize(mockDownload);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-KB');
  });

  test(' getDownloadedSize MB', function() {
    var bytes = 1024 * 1024 * 1.5; // 1.5 MB
    var mockDownload = new MockDownload(
      {
        currentBytes: bytes
      }
    );
    DownloadFormatter.getDownloadedSize(mockDownload);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-MB');
  });

  test(' getDownloadedSize GB', function() {
    var bytes = 1024 * 1024 * 1024 * 1.5; // 1.5 GB
    var mockDownload = new MockDownload(
      {
        currentBytes: bytes
      }
    );
    DownloadFormatter.getDownloadedSize(mockDownload);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-GB');
  });

  test(' getDownloadedSize TB', function() {
    var bytes = 1024 * 1024 * 1024 * 1024 * 1.5; // 1.5 TB
    var mockDownload = new MockDownload(
      {
        currentBytes: bytes
      }
    );
    DownloadFormatter.getDownloadedSize(mockDownload);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 1.50);
    assert.equal(params.unit, 'byteUnit-TB');
  });

  test(' getUUID', function() {
    var now = new Date();
    var expectedUUID = 'download-69';
    var mockDownload = new MockDownload(
      {
        id: expectedUUID
      }
    );
    var retrievedUUID = DownloadFormatter.getUUID(mockDownload);
    assert.equal(retrievedUUID, expectedUUID);
  });
});
