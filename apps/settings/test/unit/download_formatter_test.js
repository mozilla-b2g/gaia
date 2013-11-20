
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

  test(' getPercentage', function() {
    var percentage = DownloadFormatter.getFormattedPercentage(51.1, 100);
    assert.equal(percentage, 51.10);
  });

  test(' getFileName', function() {
    var url = 'http://firefoxos.com/file/nameFile.mp3';
    var mockDownload = new MockDownload(
      {
        url: url
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


  test(' getDownloadedPercentage without decimals', function() {
    var total = 1024 * 1024 * 1024; // 1 GB
    var currently = total * 0.5; // 0.5 GB or 50 %
    var mockDownload = new MockDownload(
      {
        totalBytes: total,
        currentBytes: currently
      }
    );
    var percentage = DownloadFormatter.getDownloadedPercentage(mockDownload);
    assert.equal(percentage, '50');
  });

  test(' getDownloadedPercentage with decimals', function() {
    var total = 1024 * 1024 * 1024; // 1 GB
    var currently = total * 0.611; // 0.611 GB or 61.10 %
    var mockDownload = new MockDownload(
      {
        totalBytes: total,
        currentBytes: currently
      }
    );
    var percentage = DownloadFormatter.getDownloadedPercentage(mockDownload);
    assert.equal(percentage, '61.10');
  });

  test(' getUUID', function() {
    var now = new Date();
    var mockDownload = new MockDownload(
      {
        url: 'http://firefoxos.com/fichero.mp4',
        startTime: now
      }
    );
    var expectedUUID = 'fichero.mp4' + now.getTime();
    var retrievedUUID = DownloadFormatter.getUUID(mockDownload);
    assert.equal(retrievedUUID, expectedUUID);
  });
});
