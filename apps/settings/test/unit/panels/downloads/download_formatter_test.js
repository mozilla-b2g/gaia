/* global MockL10n, DownloadFormatter, MockDownload, MockMozIntl */
'use strict';

require('/shared/test/unit/mocks/mock_download.js');
require('/shared/js/download/download_formatter.js');
require('/shared/test/unit/mocks/mock_l20n.js');
require('/shared/test/unit/mocks/mock_moz_intl.js');


suite('DownloadFormatter', function() {
  var realL10n, realMozIntl;

  suiteSetup(function() {
    realMozIntl = window.mozIntl;
    window.mozIntl = MockMozIntl;
    realL10n = document.l10n;
    document.l10n = MockL10n;
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
    window.mozIntl = realMozIntl;
    realL10n = null;
    realMozIntl = null;
  });

  test(' getFormattedSize KB', function(done) {
    var bytes = 1024 * 1.5; // 1.5 KB
    DownloadFormatter.getFormattedSize(bytes).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'1.50',
        'unit':'byteUnit-KB'
      }));
    }).then(done, done);
  });

  test(' getFormattedSize MB', function(done) {
    var bytes = 1024 * 1024 * 999; // 999 MB
    DownloadFormatter.getFormattedSize(bytes).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'999.00',
        'unit':'byteUnit-MB'
      }));
    }).then(done, done);
  });

  test(' getFormattedSize GB', function(done) {
    var bytes = 1024 * 1024 * 1024 * 2.6; // 2.6 GB
    DownloadFormatter.getFormattedSize(bytes).then((size) => {
      assert.equal(size, MockL10n._stringify('fileSize', {
        'size':'2.60',
        'unit':'byteUnit-GB'
      }));
    }).then(done, done);
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
    }).then(done, done);
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
    }).then(done, done);
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
    }).then(done, done);
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
    }).then(done, done);
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
    }).then(done, done);
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
    }).then(done, done);
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
    }).then(done, done);
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
    }).then(done, done);
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

    var mockDownload = new MockDownload({
      startTime: now
    });

    DownloadFormatter.getDate(mockDownload).then(function(date) {
      assert.equal(date, 'pretty date');
    }).then(done, done);
  });
});
