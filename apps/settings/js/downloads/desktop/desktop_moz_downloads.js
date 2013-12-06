'use strict';


var DEFAULT_DOWNLOAD = {
  id: '0',
  totalBytes: 1800,
  currentBytes: 100,
  url: 'http://firefoxos.com/archivo.mp3',
  path: '//SDCARD/Downloads/archivo.mp3',
  state: 'downloading',
  contentType: 'audio/mpeg',
  started: new Date()
};

var MOCK_LENGTH = 10;

function MockDownload(params) {
  params = params || {};
  this.id = params.id || '0';
  this.totalBytes = params.totalBytes || DEFAULT_DOWNLOAD.totalBytes;
  this.currentBytes = params.currentBytes || DEFAULT_DOWNLOAD.currentBytes;
  this.url = params.url || DEFAULT_DOWNLOAD.url;
  this.path = params.path || DEFAULT_DOWNLOAD.path;
  this.state = params.state || DEFAULT_DOWNLOAD.state;
  this.contentType = params.contentType || DEFAULT_DOWNLOAD.contentType;
  this.started = params.started || DEFAULT_DOWNLOAD.started;
}

MockDownload.prototype = {
  pause: function() {},
  resume: function() {}
};

function _getState(i) {
  if (i === 0) {
    return 'stopped';
  } else {
    return 'downloading';
  }
}

navigator.mozDownloadManager = {
  getDownloads: function() {
    return {
      then: function(fulfill) {
        var mockDownloads = [];
        for (var i = 0; i < MOCK_LENGTH; i++) {
          var download = new MockDownload({
            id: 'message-' + i,
            url: 'http://firefoxos.com/archivo' + i + '.mp3',
            path: '//SDCARD/Downloads/archivo' + i + '.mp3',
            state: _getState(i)
          });
          mockDownloads.push(download);
        }
        setTimeout(function() {
          fulfill(mockDownloads);
        });
      }
    };
  },
  remove: function() {
    return {
      then: function(fulfill) {
        setTimeout(fulfill);
      }
    };
  },
  set ondownloadstart(handler) {
    // Mock that a new download has been started
    setTimeout(function() {
      var newID = MOCK_LENGTH + 10;
      var download = new MockDownload({
        id: 'message-' + newID,
        url: 'http://firefoxos.com/loremipsumblablablablablablablablabla.mp3',
        path: '//SDCARD/Downloads/newFile.mp3',
        state: 'downloading'
      });
      handler({
        download: download
      });
    }, 5000);
  }
};
