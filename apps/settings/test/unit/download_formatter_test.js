/* global MocksHelper, MockL10n, DownloadFormatter, MockDownload */
'use strict';

require('/shared/test/unit/mocks/mock_download.js');
require('/shared/js/download/download_formatter.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');


suite('DownloadFormatter', function() {
  var realL10n;

  var mocksHelperForDownloadFormatter = new MocksHelper([
    'LazyLoader'
  ]).init();

  mocksHelperForDownloadFormatter.attachTestHelpers();

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

  test(' getFormattedSize GB', function() {
    var bytes = 1024 * 1024 * 1024 * 2.6; // 2.6 GB
    DownloadFormatter.getFormattedSize(bytes);
    assert.equal(l10nSpy.args[1][0], 'fileSize');

    var params = l10nSpy.args[1][1];
    assert.equal(params.size, 2.6);
    assert.equal(params.unit, 'byteUnit-GB');
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
    var expectedUUID = 'download-69';
    var mockDownload = new MockDownload(
      {
        id: expectedUUID
      }
    );
    var retrievedUUID = DownloadFormatter.getUUID(mockDownload);
    assert.equal(retrievedUUID, expectedUUID);
  });

  test(' getDate', function(done) {
    var now = new Date();
    var expectedPrettyDate = 'pretty' + now.toString();
    sinon.stub(navigator.mozL10n, 'DateTimeFormat', function(date) {
      return {
        fromNow: function(date, useCompactFormat) {
          assert.isUndefined(useCompactFormat);
          return 'pretty' + date.toString();
        }
      };
    });

    var mockDownload = new MockDownload({
      startTime: now
    });

    DownloadFormatter.getDate(mockDownload, function(date) {
      assert.equal(date, expectedPrettyDate);
      done();
    });
  });
});
