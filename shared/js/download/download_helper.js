'use strict';
/* exported DownloadHelper */
/* global DownloadFormatter */
/* global DownloadStore */
/* global DownloadUI */
/* global LazyLoader */
/* global MimeMapper */
/* global MozActivity */
/* global SettingsListener */

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
    var storage = getVolume(download.storageName);
    var storeAvailableReq = storage.available();

    storeAvailableReq.onsuccess = function available_onsuccess(e) {
      var path = download.storagePath;
      switch (storeAvailableReq.result) {
        case 'unavailable':
          sendError(req, ' Could not open the file: ' + path + ' from ' +
                    download.storageName, CODE.NO_SDCARD);
          break;

        case 'shared':
          sendError(req, ' Could not open the file: ' + path + ' from ' +
                    download.storageName, CODE.UNMOUNTED_SDCARD);
          break;

        default:
          try {
            var storeGetReq = storage.get(path);

            storeGetReq.onsuccess = function store_onsuccess() {
              req.done(storeGetReq.result);
            };

            storeGetReq.onerror = function store_onerror() {
              sendError(req, storeGetReq.error.name +
                        ' Could not open the file: ' + path + ' from ' +
                        download.storageName, CODE.FILE_NOT_FOUND);
            };
          } catch (ex) {
            sendError(req, 'Error getting the file ' + path + ' from ' +
                      download.storageName, CODE.DEVICE_STORAGE);
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
      filename: DownloadFormatter.getFileName(params.download),
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

  /*
   * This action gets the info for a download
   *
   * @param{Object} Configuration parameters
   */
  var InfoAction = function InfoAction(params) {
    Action.call(this, params);

    this.data = {
      name: DownloadFormatter.getFileName(params.download),
      type: params.type,
      blob: params.blob,
      size: params.download.totalBytes,
      path: params.download.path
    };
  };

  InfoAction.prototype = {
    __proto__: Action.prototype,

    /*
     * It overrides the generic run method
     */
    run: function ia_run() {
      this.req.done(this.data);
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
      INFO: {
        actionClass: InfoAction
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
      if (state === 'succeeded' || state === 'finalized') {
        LazyLoader.load(['shared/js/mime_mapper.js',
                         'shared/js/download/download_formatter.js'],
                        function loaded() {
          var type = getType(download);

          //
          // The 'open' action will always launch an activity using the original
          // content type to allow for third party applications to handle
          // arbitrary types of content.
          //
          // The 'share' action on the other hand only works with known mime
          // types at this time.
          //

          if (type.length === 0) {
            type = download.contentType;

            if (actionType !== ActionsFactory.TYPE.OPEN &&
                actionType !== ActionsFactory.TYPE.INFO) {
              sendError(req, 'Mime type not supported: ' + type,
                        CODE.MIME_TYPE_NOT_SUPPORTED);
              return;
            }
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
   * This method allows clients to remove a download, from the
   * list and the phone.
   *
   * @param{Object} It represents a DOMDownload object
   */
  function remove(download) {
    var req = new Request();
    var incompleteDownload = download.state !== 'succeeded';
    // If is not done, use download manager to remove it,
    // otherwise, deal with the datastore.
    setTimeout(function() {
      if (incompleteDownload) {
        if (!navigator.mozDownloadManager) {
          sendError(req, 'DownloadManager not present', CODE.INVALID_STATE);
        } else {
          // First we pause the download so that everyone knows it's being
          // stopped. The Downloads API itself won't stop the download first,
          // it will simply kill it.
          // XXXAus: Remove when we fix bug #1090551
          download.pause().then(
            function() {
              navigator.mozDownloadManager.remove(download).then(
                function success() {
                  req.done(download);
                },
                function error() {
                  sendError(req,
                            'DownloadManager doesnt know about this download',
                            CODE.INVALID_STATE);
                }
              );
            },
            function() {
              sendError(req,
                        'Failed to pause download before removal',
                        CODE.INVALID_STATE);
            }
          );
        }
      } else {
        req.done(download);
      }
    }, 0);

    return incompleteDownload ? req : doRemoveFromPhone(req, download);
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
      var storage = getVolume(download.storageName);
      var storeAvailableReq = storage.available();

      storeAvailableReq.onsuccess = function available_onsuccess(e) {
        var path = download.path;
        switch (storeAvailableReq.result) {
          case 'unavailable':
            sendError(req, ' Could not delete the file: ' + path + ' from ' +
                      storageName, CODE.NO_SDCARD);
            break;

          case 'shared':
            sendError(req, ' Could not delete the file: ' + path + ' from ' +
                      storageName, CODE.UNMOUNTED_SDCARD);
            break;

          default:
            var storeDeleteReq = storage.delete(download.storagePath);

            storeDeleteReq.onsuccess = function store_onsuccess() {
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
              req.done(storeDeleteReq.result);
            };

            storeDeleteReq.onerror = function store_onerror() {
              sendError(req, storeDeleteReq.error.name +
                ' Could not remove the file: ' + download.path + ' from ' +
                storageName, CODE.FILE_NOT_FOUND);
            };
        }
      };

      storeAvailableReq.onerror = function available_onerror() {
        sendError(req, 'Error getting storage state ', CODE.DEVICE_STORAGE);
      };
    };

    deleteRequest.onerror = function(error) {
      sendError(req, error.message, error.code);
    };

    return req;
  }

  function handlerError(error, download, cb) {
    LazyLoader.load('shared/js/download/download_ui.js', (function loaded() {
      var req;
      var show = DownloadUI.show;

      // Canceled activites are normal and shouldn't be interpreted as errors.
      // Unfortunately, this isn't reported in a standard way by our
      // applications (or third party apps for that matter). This is why we
      // have this lazy filter here that may need to be updated in the future
      // but hopefully will just get removed.
      if (error.message &&
          (error.message.endsWith('canceled') ||
           error.message.endsWith('cancelled'))) {
        // Since this isn't actually an error, we invoke the callback with null.
        cb && cb(null);
        // and return early.
        return;
      }

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

  function getFreeSpace(cb) {
    var storage = navigator.getDeviceStorage(storageName);

    if (!storage) {
      console.error('Cannot get free space size in sdcard');
      cb(null);
      return;
    }

    var req = storage.freeSpace();

    req.onsuccess = function(e) {
      cb(e.target.result);
    };

    req.onerror = function() {
      cb(null);
    };
  }

  /**
   *  Gets the storage for the download based on the volumen
   *  it was saved (storageName)
   */
  function getVolume(volumeName) {
    // Per API design, all media type return the same volumes.
    // So we use 'sdcard' here for no reason.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=856782#c10
    var volumes = navigator.getDeviceStorages('sdcard');
    if (!volumeName || volumeName === '') {
      return volumes[0];
    }
    for (var i = 0; i < volumes.length; ++i) {
      if (volumes[i].storageName === volumeName) {
        return volumes[i];
      }
    }
    return volumes[0];
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
    * This method returns information about a download
    *
    * @param{Object} It represents a DOMDownload object
    */
    info: function(download) {
      return runAction(ActionsFactory.TYPE.INFO, download);
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
    handlerError: handlerError,

    /*
     * Returns the free memory size in bytes
     *
     * @param{Function} This function is performed when the free memory size has
     *                  been calculated
     */
    getFreeSpace: getFreeSpace
  };
}());
