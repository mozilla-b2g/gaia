
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
 *   var req = DownloadHelper.open(download);
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
    NO_PROVIDER: 'NO_PROVIDER',
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
   * Base action that implements the commom logic for actions based on the
   * MozActivity API
   *
   * @param{Object} Configuration parameters
   */
  var Action = function Action(params) {
    this.req = params.request;
    this.name = params.actionType.activityName;
  };

  Action.prototype = {
    /*
     * It performs the action based on MozActivity
     */
    run: function a_run() {
      var activity = new MozActivity({
        name: this.name,
        data: this.data
      });

      activity.onsuccess = this._onsuccess.bind(this);
      activity.onerror = this._onerror.bind(this);
    },

    /*
     * This method implements the generic onsuccess callback
     */
    _onsuccess: function a_onsuccess() {
      this.req.done();
    },

    /*
     * This method implements the generic onerror callback
     */
    _onerror: function a_onerror(evt) {
      this.req.failed({
        message: evt.target.error.name
      });
    }
  };

  /*
   * This action opens downloads extending the Action Object
   *
   * @param{Object} Configuration parameters
   */
  var OpenAction = function OpenAction(params) {
    Action.call(this, params);

    this.data = {
      url: params.download.path,
      type: params.type,
      blob: params.blob
    };
  };

  OpenAction.prototype = {
    __proto__: Action.prototype
  };

  /*
   * This action shares downloads extending the Action Object
   *
   * @param{Object} Configuration parameters
   */
  var ShareAction = function ShareAction(params) {
    Action.call(this, params);

    this.data = {
      // 'share' activities do not work with specific mime types
      type: params.type.split('/')[0] + '/*',
      blobs: [params.blob],
      filenames: [DownloadFormatter.getFileName(params.download)]
    };
  };

  ShareAction.prototype = {
    __proto__: Action.prototype,

    /*
     * It overrides the generic onerror callback for another more suitable
     */
    _onerror: function sa_onerror(evt) {
      if (evt.target.error.name !== 'NO_PROVIDER') {
        return;
      }

      sendError(this.req, 'No provider to share file', CODE.NO_PROVIDER);
    }
  };

  // This is a factory that deals with different <Action> objects
  var ActionsFactory = {
    TYPE: {
      OPEN: {
        activityName: 'open',
        actionClass: OpenAction
      },
      SHARE: {
        activityName: 'share',
        actionClass: ShareAction
      },
      WALLPAPER: {
        activityName: 'setwallpaper',
        actionClass: ShareAction
      },
      RINGTONE: {
        activityName: 'setringtone',
        actionClass: ShareAction
      }
    },

    create: function af_create(params) {
      return new params.actionType.actionClass(params);
    }
  };

  /*
   * Returns the mime type
   *
   * @param{Object} It represents a DOMDownload object
   *
   * @returns(String) Mime type
   */
  function getType(download) {
    var fileName = DownloadFormatter.getFileName(download);
    var type = MimeMapper.guessTypeFromFileProperties(fileName,
                                                      download.contentType);
    return type;
  }

  /*
   * This method allows third-parties to open or share downloads
   *
   * @param{Object} Action types: <ActionsFactory.TYPE.OPEN> or
   *                              <ActionsFactory.TYPE.SHARE>
   *
   * @param{Object} It represents a DOMDownload object
   */
  function runAction(actionType, download) {
    var req = new Request();

    window.setTimeout(function launching() {
      var state = download.state;
      if (state === 'succeeded') {
        LazyLoader.load(['shared/js/mime_mapper.js',
                         'shared/js/download/download_formatter.js'],
                        function loaded() {
          var type = getType(download);

          if (type.length === 0) {
            sendError(req, 'Mime type not supported: ' + type,
                      CODE.MIME_TYPE_NOT_SUPPORTED);
            return;
          }

          var blobReq = getBlob(download);

          blobReq.onsuccess = function() {
            ActionsFactory.create({
              actionType: actionType,
              download: download,
              type: type,
              blob: blobReq.result,
              request: req
            }).run();
          };

          blobReq.onerror = function() {
            // Problem getting the blob from the sdcard
            req.failed(blobReq.error);
          };
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
        case CODE.NO_PROVIDER:
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
    open: function(download) {
      return runAction(ActionsFactory.TYPE.OPEN, download);
    },

   /*
    * This method allows clients to share a downlaoded file
    *
    * @param{Object} It represents a DOMDownload object
    */
    share: function(download) {
      return runAction(ActionsFactory.TYPE.SHARE, download);
    },

   /*
    * This method allows clients to set as wallaper a downlaoded file
    *
    * @param{Object} It represents a DOMDownload object
    */
    wallpaper: function(download) {
      return runAction(ActionsFactory.TYPE.WALLPAPER, download);
    },

   /*
    * This method allows clients to set as ringtone a downlaoded file
    *
    * @param{Object} It represents a DOMDownload object
    */
    ringtone: function(download) {
      return runAction(ActionsFactory.TYPE.RINGTONE, download);
    },

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
