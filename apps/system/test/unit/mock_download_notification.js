
'use strict';
/* exported MockDownloadNotification */
var MockDownloadNotification = function(download) {
  this.download = download;
  MockDownloadNotification.methodCalled = 'DownloadNotification';
};

MockDownloadNotification.prototype.onClick = function() {
  MockDownloadNotification.methodCalled = 'onClick';
};

MockDownloadNotification.mTeardown = function() {
  MockDownloadNotification.methodCalled = null;
};
