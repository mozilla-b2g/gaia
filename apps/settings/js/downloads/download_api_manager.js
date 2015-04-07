/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {

  var downloadsCache = {};
  var downloadsListener = null;

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

  function _getTypeFromOperation(operation) {
    var TYPES = { added: 'added' };
    return TYPES[operation] || 'unknown';
  }

  function _updateDownloadsCacheWithDataStoreDownload(dsChange) {
    var getReq = DownloadStore.get(dsChange.id);
    getReq.onsuccess = function(event) {
      var entries = Object.keys(downloadsCache);
      var download = event.target.result;

      var cachedDownload = null;
      for (var i = 0; i < entries.length; i++) {
        var downloadCacheEntry = downloadsCache[entries[i]];
        if (downloadCacheEntry.storageName == download.storageName &&
            downloadCacheEntry.storagePath == download.storagePath) {
          cachedDownload = downloadCacheEntry;
          break;
        }
      }

      var changeEvent = {
        type: _getTypeFromOperation(dsChange.operation),
        download: download
      };

      if (cachedDownload) {
        changeEvent.downloadApiId = cachedDownload.id;
        _deleteFromDownloadsCache(cachedDownload.id);
        _setDownload(download);
      }

      _callListener(changeEvent);
    };
    getReq.onerror = function(e) {
      console.error('Failed to get download with id = ',
                    dsChange.id,
                    ' -- ',
                    e);
    };
  }

  function getDownloadId(download) {
    return DownloadFormatter.getUUID(download);
  }

  /*
   * It deletes a download
   *
   * @param{Object} It represents a download item that defines the download id
   *                and if the user's confirmation should be omitted (optional)
   *
   * @param{Function} Success callback
   *
   * @param{Function} Error callback
   */
  function _deleteDownload(item, successCb, errorCb) {
    var id = item.id;
    var download = downloadsCache[id];

    function doDeleteDownload() {
      var reqRemove = DownloadHelper.remove(download);

      reqRemove.onsuccess = function req_onerror() {
        _deleteFromDownloadsCache(id);
        successCb();
      };

      reqRemove.onerror = function req_onerror() {
        DownloadHelper.handlerError(reqRemove.error, download);
        errorCb(reqRemove.error.code);
      };
    }

    if (item.force) {
      doDeleteDownload();
    } else {
      var reqShow = DownloadUI.show(DownloadUI.TYPE.DELETE, download);

      reqShow.onconfirm = function confirmed() {
        doDeleteDownload();
      };

      reqShow.oncancel = errorCb;
    }
  }

  function _dataStoreChangeHandler(dsChange) {
    switch (dsChange.operation) {
      case 'added':
        // Update function will call the listener when appropriate.
        window.setTimeout(function nextTickUpdated() {
          _updateDownloadsCacheWithDataStoreDownload(dsChange);
        }, 0);
        break;
    }
  }

  function _callListener(data) {
    downloadsListener && downloadsListener(data);
  }

  var DownloadApiManager = {
    _initialized: false,

    init: function() {
      if (this._initialized) {
        return;
      }

      // Add a listener to track when Download objects get added to the
      // Download Store. This is when we'll update our Download Item to use
      // the DataStore representation instead of the Download API DOM Download
      // object.
      var req = DownloadStore.addListener(_dataStoreChangeHandler);

      req.onsuccess = (function() {
        this._initialized = true;
      }.bind(this));
      req.onerror = (function(e) {
        console.error('Failed to initialize DownloadApiManager properly.', e);
      });
    },

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
      function(downloadItems, onDeletedSuccess, onDeletedError, oncomplete) {
      if (downloadItems == null) {
        if (typeof onDeletedError === 'function') {
          onDeletedError(null, 'Download items not defined or null');
        }
        return;
      }
      if (downloadItems.length === 0) {
        if (typeof oncomplete === 'function') {
          oncomplete();
        }
        return;
      }

      var currentItem = downloadItems.pop();
      var self = this;
      _deleteDownload(currentItem, function onDelete() {
        onDeletedSuccess && onDeletedSuccess(currentItem.id);
        self.deleteDownloads(
          downloadItems,
          onDeletedSuccess,
          onDeletedError,
          oncomplete
        );
      }, function onError(msg) {
        onDeletedError && onDeletedError(currentItem.id, msg);
        self.deleteDownloads(
          downloadItems,
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
    },

    setListener: function(listener) {
      downloadsListener = listener;
    }
  };

  exports.DownloadApiManager = DownloadApiManager;

}(window));
