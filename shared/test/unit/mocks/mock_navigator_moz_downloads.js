'use strict';
/* global MockDownload */
/* exported MockMozDownloads */

/* Allow setter without getter */
/* jshint -W078 */

/*
 * This mockup needs to import as well:
 * /shared/unit/tests/mock/mock_download.js
 */


var MockMozDownloads = {
  _getState: function(i) {
    if (i === 0) {
      return 'finalized';
    } else if (i === 1) {
      return 'stopped';
    } else {
      return 'downloading';
    }
  },
  mockLength: 10,
  getDownloads: function() {
    return {
      then: function(fulfill, reject) {
        var mockDownloads = [];
        for (var i = 0; i < this.mockLength; i++) {
          var download = new MockDownload({
            id: String(i),
            url: 'http://firefoxos.com/archivo' + i + '.mp3',
            startTime: new Date(i * 10000),
            state: this._getState(i)
          });
          mockDownloads.push(download);
        }
        fulfill(mockDownloads);
      }.bind(this)
    };
  },
  set ondownloadstarted(handler) {
    // Mock that a new download has been started
    var newID = this.mockLength + 1;
    var download = new MockDownload({
      id: String(newID),
      url: 'http://firefoxos.com/archivo' + newID + '.mp3'
    });
    setTimeout(function() {
      handler(download);
    });
  },
  remove: function(download) {
    return {
      then: function(success, error) {
        success(download);
      }
    };
  }
};
