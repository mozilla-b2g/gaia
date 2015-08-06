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

  test(' getFormattedSize KB', function(done) {
    var bytes = 1024 * 1.5; // 1.5 KB
    DownloadFormatter.getFormattedSize(bytes).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-KB'
      }));
      done();
    });
  });

  test(' getFormattedSize MB', function(done) {
    var bytes = 1024 * 1024 * 999; // 999 MB
    DownloadFormatter.getFormattedSize(bytes).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'999.00',
        'unit':'byteUnit-MB'
      }));
      done();
    });
  });

  test(' getFormattedSize GB', function(done) {
    var bytes = 1024 * 1024 * 1024 * 2.6; // 2.6 GB
    DownloadFormatter.getFormattedSize(bytes).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'2.60',
        'unit':'byteUnit-GB'
      }));
      done();
    });
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

  test(' getTotalSize KB', function(done) {
    var bytes = 1024 * 1.5; // 1.5 KB
    var mockDownload = new MockDownload(
      {
        totalBytes: bytes
      }
    );
    DownloadFormatter.getTotalSize(mockDownload).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-KB'
      }));
      done();
    });
  });

  test(' getTotalSize MB', function(done) {
    var bytes = 1024 * 1024 * 1.5; // 1.5 MB
    var mockDownload = new MockDownload(
      {
        totalBytes: bytes
      }
    );
    DownloadFormatter.getTotalSize(mockDownload).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-MB'
      }));
      done();
    });
  });

  test(' getTotalSize GB', function(done) {
    var bytes = 1024 * 1024 * 1024 * 1.5; // 1.5 GB
    var mockDownload = new MockDownload(
      {
        totalBytes: bytes
      }
    );
    DownloadFormatter.getTotalSize(mockDownload).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-GB'
      }));
      done();
    });
  });

  test(' getTotalSize TB', function(done) {
    var bytes = 1024 * 1024 * 1024 * 1024 * 1.5; // 1.5 TB
    var mockDownload = new MockDownload(
      {
        totalBytes: bytes
      }
    );
    DownloadFormatter.getTotalSize(mockDownload).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-TB'
      }));
      done();
    });
  });

  test(' getDownloadedSize KB', function(done) {
    var bytes = 1024 * 1.5; // 1.5 KB
    var mockDownload = new MockDownload(
      {
        currentBytes: bytes
      }
    );
    DownloadFormatter.getDownloadedSize(mockDownload).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-KB'
      }));
      done();
    });
  });

  test(' getDownloadedSize MB', function(done) {
    var bytes = 1024 * 1024 * 1.5; // 1.5 MB
    var mockDownload = new MockDownload(
      {
        currentBytes: bytes
      }
    );
    DownloadFormatter.getDownloadedSize(mockDownload).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-MB'
      }));
      done();
    });
  });

  test(' getDownloadedSize GB', function(done) {
    var bytes = 1024 * 1024 * 1024 * 1.5; // 1.5 GB
    var mockDownload = new MockDownload(
      {
        currentBytes: bytes
      }
    );
    DownloadFormatter.getDownloadedSize(mockDownload).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-GB'
      }));
      done();
    });
  });

  test(' getDownloadedSize TB', function(done) {
    var bytes = 1024 * 1024 * 1024 * 1024 * 1.5; // 1.5 TB
    var mockDownload = new MockDownload(
      {
        currentBytes: bytes
      }
    );
    DownloadFormatter.getDownloadedSize(mockDownload).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-TB'
      }));
      done();
    });
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

    DownloadFormatter.getDate(mockDownload).then(function(date) {
      assert.equal(date, expectedPrettyDate);
      done();
    });
  });
});
