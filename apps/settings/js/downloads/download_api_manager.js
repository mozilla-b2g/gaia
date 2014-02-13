/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {

  var downloadsCache = {};

  var COMPLETE_STATE = 'finalized';
  var SUCCEEDED_STATE = 'succeeded';

  function _appendDownloadsToCache(downloads) {
    for (var i = 0; i < downloads.length; i++) {
      _setDownload(downloads[i]);
    }
  }

  function _setDownload(download) {
    downloadsCache[getDownloadId(download)] = download;
  }

  function _deleteFromDownloadsCache(id) {
    delete downloadsCache[id];
  }

  function _resetDownloadsCache() {
    downloadsCache = {};
  }

  function getDownloadId(download) {
    return DownloadFormatter.getUUID(download);
  }

  function _deleteDownload(id, successCb, errorCb) {
    var download = downloadsCache[id];

    var reqShow = DownloadUI.show(DownloadUI.TYPE.DELETE, download);

    reqShow.onconfirm = function confirmed() {
      _deleteFromDownloadsCache(id);
      var reqRemove = DownloadHelper.remove(download);
      reqRemove.onsuccess = successCb;
      reqRemove.onerror = errorCb;
    };

    reqShow.oncancel = errorCb;
  }

  var DownloadApiManager = {
    getDownloads: function(onsuccess, onerror, oncomplete) {
      var promise = navigator.mozDownloadManager.getDownloads();
      promise.then(
        function(apiDownloads) {
          function isDownloaded(download) {
            return (download.state !== COMPLETE_STATE &&
                    download.state !== SUCCEEDED_STATE);
          }
          // Not completed from the API. We need to remove the ones handled
          // by Datastore, due to we are storing all completed downloads
          // (not only within last week).
          var notCompletedDownloads = apiDownloads.filter(isDownloaded);

          // Retrieve complete downloads from Datastore
          var request = DownloadStore.getAll();
          request.onsuccess = function(event) {
            // Completed from API
            var completedDownloads = event.target.result;
            // Merge both
            var downloads = notCompletedDownloads.concat(completedDownloads);
            // Sort by timestamp
            downloads.sort(function(a, b) {
              // TODO: Remove this when bug #945366
              // will be fixed
              try {
                return b.startTime.getTime() - a.startTime.getTime();
              } catch (ex) {
                return true;
              }
            });
            // Append to the Dictionary
            _appendDownloadsToCache(downloads);
            onsuccess(downloads, oncomplete);
          };
          request.onerror = function(e) {
            console.warn('DATASTORE FAILED');
            // Use only the API
            _appendDownloadsToCache(notCompletedDownloads);
            onsuccess(notCompletedDownloads, oncomplete);
          };
        }.bind(this),
        onerror
      );
    },

    setOnDownloadHandler: function(callback) {
      function handler(evt) {
        var download = evt.download;
        _setDownload(download);
        if (typeof callback === 'function') {
          callback(download);
        }
      }
      navigator.mozDownloadManager.ondownloadstart = handler;
    },

    deleteDownloads:
      function(downloadIds, onDeletedSuccess, onDeletedError, oncomplete) {
      if (downloadIds == null) {
        if (typeof onDeletedError === 'function') {
          onDeletedError(null, 'Download IDs not defined or null');
        }
        return;
      }
      if (downloadIds.length === 0) {
        if (typeof oncomplete === 'function') {
          oncomplete();
        }
        return;
      }

      var currentId = downloadIds.pop();
      var self = this;
      _deleteDownload(currentId, function onDelete() {
        onDeletedSuccess && onDeletedSuccess(currentId);
        self.deleteDownloads(
          downloadIds,
          onDeletedSuccess,
          onDeletedError,
          oncomplete
        );
      }, function onError(msg) {
        onDeletedError && onDeletedError(currentId, msg);
        self.deleteDownloads(
          downloadIds,
          onDeletedSuccess,
          onDeletedError,
          oncomplete
        );
      });
    },

    getDownload: function(id) {
      return downloadsCache[id] || null;
    },

    updateDownload: function(download) {
      _setDownload(download);
    }
  };

  exports.DownloadApiManager = DownloadApiManager;

}(this));
