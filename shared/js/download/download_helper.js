
'use strict';

/*
 * DownloadHelper.js: Perform some utility functions with DOMDownload
 *  objects.
 *
 * - You have to include in you HTML:
 *
 *   <!-- <script src="shared/js/mime_mapper.js"></script> -->
 *   <!-- <script src="shared/js/download/download_store.js"></script> -->
 *   <script defer src="shared/js/lazy_loader.js"></script>
 *
 * - How to use this component.
 *
 *   For launching a download
 *
 *   var req = DownloadHelper.launch(download);
 *
 *   req.onsuccess = function req_onsuccess() {
 *     alert('The download was opened so we can remove the notification');
 *   }
 *
 *   req.onerror = function req_onerror() {
 *     alert('Something wrong!: ' + req.error.message);
 *   }
 *
 */
var DownloadHelper = (function() {

  // Exception code constants
  var CODE = {
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    DEVICE_STORAGE: 'DEVICE_STORAGE',
    MIME_TYPE_NOT_SUPPORTED: 'MIME_TYPE_NOT_SUPPORTED',
    INVALID_STATE: 'INVALID_STATE',
    NO_SDCARD: 'NO_SDCARD',
    UNMOUNTED_SDCARD: 'UNMOUNTED_SDCARD'
  };

 /*
  * Request auxiliary object to support asynchronous calls
  */
  var Request = function() {
    this.done = function(result) {
      if (typeof this.onsuccess === 'function') {
        this.result = result;
        window.setTimeout(function() {
          this.onsuccess({
            target: this
          });
        }.bind(this), 0);
      }
    };

    this.failed = function(error) {
      if (typeof this.onerror === 'function') {
        this.error = error;
        window.setTimeout(function() {
          this.onerror({
            target: this
          });
        }.bind(this), 0);
      }
    };
  };

  // Storage name by default
  var STORAGE_NAME_BY_DEFAULT = 'sdcard';

  // Storage name settings key
  var STORAGE_NAME_KEY = 'device.storage.writable.name';

  // Current storage name
  var storageName = STORAGE_NAME_BY_DEFAULT;

  LazyLoader.load('shared/js/settings_listener.js', function settingsLoaded() {
    SettingsListener.observe(STORAGE_NAME_KEY, STORAGE_NAME_BY_DEFAULT,
      function setStorageName(evt) {
        var settingValue = evt.settingValue;
        if (settingValue) {
          storageName = settingValue;
        }
      }
    );
  });

  /*
   * Returns the relative path from the file absolute path
   *
   * @param{String} Absolute path
   *
   * @returns(String) Relative path
   */
  function getRelativePath(path) {
    var storagePath = storageName + '/';
    return path.substring(path.indexOf(storagePath) + storagePath.length);
  }

 /*
  * Error auxiliary method
  */
  function sendError(req, message, code) {
    req.failed({
      message: message,
      code: code
    });

    console.error(message);
  }

  /*
   * Returns a blob from the sdcard
   *
   * @param{Object} The download object
   *
   */
  function getBlob(download) {
    var req = new Request();
    var storage = navigator.getDeviceStorage(storageName);
    var storeAvailableReq = storage.available();

    storeAvailableReq.onsuccess = function available_onsuccess(e) {
      var path = download.path;
      switch (storeAvailableReq.result) {
        case 'unavailable':
          sendError(req, ' Could not open the file: ' + path + ' from ' +
                    storageName, CODE.NO_SDCARD);
          break;

        case 'shared':
          sendError(req, ' Could not open the file: ' + path + ' from ' +
                    storageName, CODE.UNMOUNTED_SDCARD);
          break;

        default:
          try {
            path = getRelativePath(path);
            var storeGetReq = storage.get(path);

            storeGetReq.onsuccess = function store_onsuccess() {
              req.done(storeGetReq.result);
            };

            storeGetReq.onerror = function store_onerror() {
              sendError(req, storeGetReq.error.name +
                        ' Could not open the file: ' + path + ' from ' +
                        storageName, CODE.FILE_NOT_FOUND);
            };
          } catch (ex) {
            sendError(req, 'Error getting the file ' + path + ' from ' +
                      storageName, CODE.DEVICE_STORAGE);
          }
      }
    };

    storeAvailableReq.onerror = function available_onerror() {
      sendError(req, 'Error getting storage state ', CODE.DEVICE_STORAGE);
    };

    return req;
  }

  /*
   * It creates an activity to open a blob
   *
   * @param{Object} The download object
   *
   * @param{String} Mime type
   *
   * @param{Object} The blob object that represents the file
   *
   * @param{Object} This is the Request object
   */
  function createActivity(download, contentType, blob, req) {
    var activity = new MozActivity({
      name: 'open',
      data: {
        url: download.path,
        type: contentType,
        blob: blob
      }
    });

    activity.onsuccess = function activity_onsuccess() {
      req.done();
    };

    activity.onerror = function activity_onerror() {
      req.failed({
        message: activity.error.name
      });
    };
  }

  function doLaunch(download, req) {
    var fileName = DownloadFormatter.getFileName(download);
    var type = MimeMapper.guessTypeFromFileProperties(fileName,
                                                      download.contentType);

    if (type.length === 0) {
      sendError(req, 'Mime type not supported: ' + type,
                CODE.MIME_TYPE_NOT_SUPPORTED);
      return;
    }

    var blobReq = getBlob(download);

    blobReq.onsuccess = function() {
      // We have the blob, so opening and crossing fingers...
      createActivity(download, type, blobReq.result, req);
    };

    blobReq.onerror = function() {
      // Problem getting the blob from the sdcard
      req.failed(blobReq.error);
    };
  }

  /*
   * This method allows clients to open a downlaod
   *
   * @param{Object} It represents a DOMDownload object
   */
  function launch(download) {
    var req = new Request();

    window.setTimeout(function launching() {
      var state = download.state;
      if (state === 'succeeded') {
        LazyLoader.load(['shared/js/mime_mapper.js',
                         'shared/js/download/download_formatter.js'],
                        function loaded() {
          doLaunch(download, req);
        });
        return;
      }

      sendError(req, 'Becareful, the download is not finished!',
                CODE.INVALID_STATE);
    }, 0);

    return req;
  }

  /*
   * This method allows clients to remove a downlaod, from the
   * list and the phone.
   *
   * @param{Object} It represents a DOMDownload object
   */
  function remove(download) {
    var req = new Request();
    // If is not done, use download manager to remove it,
    // otherwise, deal with the datastore.
    setTimeout(function() {
      if (download.state !== 'succeeded') {
        if (!navigator.mozDownloadManager) {
          sendError(req, 'DownloadManager not present', CODE.INVALID_STATE);
        } else {
          navigator.mozDownloadManager.remove(download).then(
            function success() {
              req.done(download);
            },
            function error() {
              sendError(req, 'DownloadManager doesnt know about this download',
                CODE.INVALID_STATE);
            }
          );
        }
      } else {
        req.done(download);
      }
    }, 0);

    return doRemoveFromPhone(req, download);
  }

  /*
   * Performs the proper delete of the physical file, also
   * from the datastore if the download has finished.
   *
   * @param{Object} This is the Request object
   * @param{Object} It represents a DOMDownload object
   */
  function doRemoveFromPhone(deleteRequest, download) {
    var req = new Request();

    deleteRequest.onsuccess = function() {
      var storeReq =
        navigator.getDeviceStorage(storageName).
          delete(getRelativePath(download.path));

      storeReq.onsuccess = function store_onsuccess() {
        // Remove from the datastore if status is 'succeeded'
        // if we find any problem with the datastore, don't send
        // an error, since the physical remove already happened
        if (download.state === 'succeeded') {
          LazyLoader.load(['/shared/js/download/download_store.js'],
            function() {
              DownloadStore.remove(download);
            }
          );
        }
        req.done(storeReq.result);
      };

      storeReq.onerror = function store_onerror() {
        sendError(req, storeReq.error.name + ' Could not remove the file: ' +
                  download.path + ' from ' + storageName, CODE.FILE_NOT_FOUND);
      };
    };

    deleteRequest.onerror = function(error) {
      sendError(req, error.message, error.code);
    };

    return req;
  };

  function handlerError(error, download, cb) {
    LazyLoader.load('shared/js/download/download_ui.js', (function loaded() {
      var req;
      var show = DownloadUI.show;

      switch (error.code) {
        case CODE.NO_SDCARD:
        case CODE.UNMOUNTED_SDCARD:
        case CODE.FILE_NOT_FOUND:
          req = show(DownloadUI.TYPE[error.code], download, true);
          req.onconfirm = cb;

          break;

        case CODE.MIME_TYPE_NOT_SUPPORTED:
          req = show(DownloadUI.TYPE.UNSUPPORTED_FILE_TYPE, download, true);
          req.onconfirm = function tuftOnConfirm() {
            showRemoveFileUI(download, cb);
          };

          break;

        default:
          req = show(DownloadUI.TYPE.FILE_OPEN_ERROR, download, true);
          req.onconfirm = function tfoeOnConfirm() {
            showRemoveFileUI(download, cb);
          };

          break;
      }

      // We have to remove the notification if the user cancels
      req.oncancel = cb;
    }));
  }

  function showRemoveFileUI(download, cb) {
    var req = DownloadUI.show(DownloadUI.TYPE.DELETE, download, true);

    req.oncancel = cb;

    req.onconfirm = function doRemove() {
      if (typeof cb === 'function') {
        cb(download);
      } else {
        remove(download);
      }
    };
  }

  return {
   /*
    * This method allows clients to open a downlaod
    *
    * @param{Object} It represents a DOMDownload object
    */
    launch: launch,

    /*
     * Given a download, remove it from the DownloadManager
     * list, and the file system.
     *
     * @param{Object} It represents a DOMDownload object
     */
    remove: remove,

    /*
     * Returns exception code constants
     */
    get CODE() {
      return CODE;
    },

    /*
     * This method handles different errors when users attemp to open files
     *
     * @param{Object} Error object
     *
     * @param{Object} It represents a DOMDownload object
     *
     * @param{Function} This function is performed when the flow is finished
     */
    handlerError: handlerError
  };
}());
