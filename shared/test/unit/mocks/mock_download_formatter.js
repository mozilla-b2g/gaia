'use strict';
/* exported MockDownloadFormatter */

var MockDownloadFormatter = {
  getFormattedSize: function(bytes) {
    return '45 MB';
  },
  getPercentage: function(download) {
    return 10;
  },
  getFileName: function(download) {
    return 'file.mp3';
  },
  getTotalSize: function(download) {
    return '12 MB';
  },
  getDownloadedSize: function(download) {
   return '2 MB';
  },
  getDate: function(download, callback) {
    callback && callback('Just now');
  },
  getUUID: function(download) {
    return download.id;
  }
};
