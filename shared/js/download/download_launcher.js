
'use strict';

/*
 * DownloadLauncher.js: Allows to open download object based on promises
 *
 * - You have to include in you HTML:
 *
 *   <!-- <script src="shared/js/mime_mapper.js"></script> -->
 *   <script defer src="shared/js/lazy_loader.js"></script>
 *
 * - How to use this component.
 *
 *   var req = DownloadLauncher.launch(download);
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
var DownloadLauncher = (function() {

  // Exception code constants
  var CODE = {
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    DEVICE_STORAGE: 'DEVICE_STORAGE',
    MIME_TYPE_NOT_SUPPORTED: 'MIME_TYPE_NOT_SUPPORTED',
    INVALID_STATE: 'INVALID_STATE'
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

    window.setTimeout(function doGetBlob() {
      var path = download.path;

      try {
        path = getRelativePath(path);
        var storeReq = navigator.getDeviceStorage(storageName).get(path);

        storeReq.onsuccess = function store_onsuccess() {
          req.done(storeReq.result);
        };

        storeReq.onerror = function store_onerror() {
          sendError(req, storeReq.error.name + ' Could not open the file: ' +
                    path + ' from ' + storageName, CODE.FILE_NOT_FOUND);
        };
      } catch (ex) {
        sendError(req, 'Error getting the file ' + path + ' from ' +
                  storageName, CODE.DEVICE_STORAGE);
      }
    }, 0);

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

  return {
   /*
    * This method allows clients to open a downlaod
    *
    * @param{Object} It represents a DOMDownload object
    */
    launch: launch,

    /*
     * Returns exception code constants
     */
    get CODE() {
      return CODE;
    }
  };
}());
