/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

// Following formats are supported by DeviceStorage
// Ref: http://dxr.mozilla.org/mozilla-central/toolkit/content/
// devicestorage.properties
// # Extensions we recognize for DeviceStorage storage areas
// pictures=*.jpe; *.jpg; *.jpeg; *.gif; *.png; *.bmp;
// music=*.mp3; *.ogg; *.m4a; *.m4b; *.m4p; *.m4r; *.3gp; *.mp4; *.aac; *.m3u;
//       *.pls; *.opus;
// videos=*.mp4; *.mpeg; *.mpg; *.ogv; *.ogx; *.webm; *.3gp; *.ogg;

var FileFormats = {       // Reference link:
  // Image section
  jpe: 'image/jpeg',      // http://en.wikipedia.org/wiki/JPEG
  jpg: 'image/jpeg',      // http://en.wikipedia.org/wiki/JPEG
  jpeg: 'image/jpeg',     // http://en.wikipedia.org/wiki/JPEG
  gif: 'image/gif',       // http://en.wikipedia.org/wiki/Internet_media_type
  png: 'image/png',       // http://en.wikipedia.org/wiki/Internet_media_type
  bmp: 'image/bmp',       // http://en.wikipedia.org/wiki/BMP_file_format

  // Music section
  mp3: 'audio/mpeg',      // http://en.wikipedia.org/wiki/Internet_media_type
  m4a: 'audio/x-m4a',     // http://www.mediawiki.org/wiki/
  m4b: 'audio/x-m4b',     // Mobile_browser_testing/iPhone
  m4p: 'audio/x-m4p',     // Same as above link
  m4r: 'video/mp4',       // http://en.wikipedia.org/wiki/MPEG-4_Part_14

  // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=850544
  // We need to identify audio or video type by metadata parser for these format
  // Before we support metadata parser, let these file format to be video type.
  // ogg: 'audio/ogg',    // http://en.wikipedia.org/wiki/Ogg
  // 3gp: 'audio/3gpp',   // http://en.wikipedia.org/wiki/Advanced_Audio_Coding
  // mp4: 'audio/mp4',    // http://en.wikipedia.org/wiki/Internet_media_type
  aac: 'audio/aac',       // http://en.wikipedia.org/wiki/Advanced_Audio_Coding
  m3u: 'audio/x-mpegurl', // http://en.wikipedia.org/wiki/M3U
  pls: 'audio/x-scpls',   // http://en.wikipedia.org/wiki/PLS_%28file_format%29
  opus: 'audio/ogg',      // http://de.wikipedia.org/wiki/Opus_%28Audioformat%29

  // Video section
  mp4: 'video/mp4',       // http://en.wikipedia.org/wiki/MPEG-4_Part_14
  mpeg: 'video/mpeg',     // http://wiki.whatwg.org/wiki/Video_type_parameters
  mpg: 'video/mpeg',      // http://wiki.whatwg.org/wiki/Video_type_parameters
  ogv: 'video/ogg',       // http://en.wikipedia.org/wiki/Ogg
  ogx: 'video/ogg',       // http://en.wikipedia.org/wiki/Ogg
  webm: 'video/webm',     // http://wiki.whatwg.org/wiki/Video_type_parameters
  '3gp': 'video/3gpp',    // http://wiki.whatwg.org/wiki/Video_type_parameters
  ogg: 'audio/ogg'        // http://en.wikipedia.org/wiki/Ogg (belong to audio)
};

var BluetoothTransfer = {
  bannerContainer: null,
  pairList: {
    index: []
  },
  _deviceStorage: navigator.getDeviceStorage('sdcard'),
  _debug: false,

  get transferStatusList() {
    delete this.transferStatusList;
    return this.transferStatusList =
      document.getElementById('bluetooth-transfer-status-list');
  },

  get banner() {
    delete this.banner;
    return this.banner = document.getElementById('system-banner');
  },

  init: function bt_init() {
    // Bind message handler for transferring file callback
    navigator.mozSetMessageHandler('bluetooth-opp-receiving-file-confirmation',
      this.onReceivingFileConfirmation.bind(this)
    );

    // Listen to 'bluetooth-opp-transfer-start' from bluetooth.js
    window.addEventListener('bluetooth-opp-transfer-start',
      this.onUpdateProgress.bind(this, 'start')
    );

    navigator.mozSetMessageHandler('bluetooth-opp-update-progress',
      this.onUpdateProgress.bind(this, 'progress')
    );

    // Listen to 'bluetooth-opp-transfer-complete' from bluetooth.js
    window.addEventListener('bluetooth-opp-transfer-complete',
      this.onTransferComplete.bind(this)
    );
    this.bannerContainer = this.banner.firstElementChild;
  },

  getDeviceName: function bt_getDeviceName(address) {
    var _ = navigator.mozL10n.get;
    var length = this.pairList.index.length;
    for (var i = 0; i < length; i++) {
      if (this.pairList.index[i].address == address)
        return this.pairList.index[i].name;
    }
    return _('unknown-device');
  },

  getPairedDevice: function bt_getPairedDevice(callback) {
    var adapter = Bluetooth.getAdapter();
    if (adapter == null) {
      var msg = 'Cannot get Bluetooth adapter.';
      this.debug(msg);
      return;
    }
    var self = this;
    var req = adapter.getPairedDevices();
    req.onsuccess = function bt_getPairedSuccess() {
      self.pairList.index = req.result;
      var length = self.pairList.index.length;
      if (length == 0) {
        var msg =
          'There is no paired device! Please pair your bluetooth device first.';
        self.debug(msg);
        return;
      }
      if (callback) {
        callback();
      }
    };
    req.onerror = function() {
      var msg = 'Can not get paired devices from adapter.';
      self.debug(msg);
    };
  },

  debug: function bt_debug(msg) {
    if (!this._debug)
      return;

    console.log('[System Bluetooth Transfer]: ' + msg);
  },

  humanizeSize: function bt_humanizeSize(bytes) {
    var _ = navigator.mozL10n.get;
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var size, e;
    if (bytes) {
      e = Math.floor(Math.log(bytes) / Math.log(1024));
      size = (bytes / Math.pow(1024, e)).toFixed(2);
    } else {
      e = 0;
      size = '0.00';
    }
    return _('fileSize', {
      size: size,
      unit: _('byteUnit-' + units[e])
    });
  },

  onReceivingFileConfirmation: function bt_onReceivingFileConfirmation(evt) {
    // Prompt appears when a transfer request from a paired device is received.
    var _ = navigator.mozL10n.get;

    var address = evt.address;
    var fileSize = evt.fileLength;
    var self = this;
    var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';

    // Check storage is available or not before the prompt.
    this.checkStorageSpace(fileSize,
      function checkStorageSpaceComplete(isStorageAvailable, errorMessage) {
        if (isStorageAvailable) {
          self.getPairedDevice(function getPairedDeviceComplete() {
            var deviceName = self.getDeviceName(address);
            NotificationHelper.send(_('notification-fileTransfer-title',
                                    { deviceName: deviceName }),
                                    _('notification-fileTransfer-description'),
                                    icon,
                                    function() {
                                      UtilityTray.hide();
                                      self.showReceivePrompt(evt);
                                    });
          });
        } else {
          self.showStorageUnavaliablePrompt(errorMessage);
        }
    });
  },

  showReceivePrompt: function bt_showReceivePrompt(evt) {
    var _ = navigator.mozL10n.get;

    var address = evt.address;
    var fileName = evt.fileName;
    var fileSize = this.humanizeSize(evt.fileLength);
    var cancel = {
      title: _('deny'),
      callback: this.declineReceive.bind(this, address)
    };

    var confirm = {
      title: _('transfer'),
      callback: this.acceptReceive.bind(this, address)
    };

    var deviceName = '';
    var self = this;
    this.getPairedDevice(function getPairedDeviceComplete() {
      deviceName = self.getDeviceName(address);
      CustomDialog.show(_('acceptFileTransfer'),
                        _('wantToReceiveFile',
                        { deviceName: deviceName,
                          fileName: fileName,
                          fileSize: fileSize }),
                        cancel, confirm);
    });
  },

  declineReceive: function bt_declineReceive(address) {
    CustomDialog.hide();
    var adapter = Bluetooth.getAdapter();
    if (adapter != null) {
      adapter.confirmReceivingFile(address, false);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  acceptReceive: function bt_acceptReceive(address, fileSize) {
    CustomDialog.hide();
    var adapter = Bluetooth.getAdapter();
    if (adapter != null) {
      adapter.confirmReceivingFile(address, true);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  showStorageUnavaliablePrompt: function bt_showStorageUnavaliablePrompt(msg) {
    var _ = navigator.mozL10n.get;
    var confirm = {
      title: _('confirm'),
      callback: function() {
        CustomDialog.hide();
      }
    };

    var body = msg;
    CustomDialog.show(_('cannotReceiveFile'), body, confirm);
  },

  checkStorageSpace: function bt_checkStorageSpace(fileSize, callback) {
    if (!callback)
      return;

    var _ = navigator.mozL10n.get;
    var storage = this._deviceStorage;

    var availreq = storage.available();
    availreq.onsuccess = function(e) {
      switch (availreq.result) {
      case 'available':
        // skip down to the code below
        break;
      case 'unavailable':
        callback(false, _('sdcard-not-exist'));
        return;
      case 'shared':
        callback(false, _('sdcard-in-use'));
        return;
      default:
        callback(false, _('unknown-error'));
        return;
      }

      // If we get here, then the sdcard is available, so we need to find out
      // if there is enough free space on it
      var freereq = storage.freeSpace();
      freereq.onsuccess = function() {
        if (freereq.result >= fileSize)
          callback(true, '');
        else
          callback(false, _('sdcard-no-space2'));
      };
      freereq.onerror = function() {
        callback(false, _('cannotGetStorageState'));
      };
    };

    availreq.onerror = function(e) {
      callback(false, _('cannotGetStorageState'));
    };
  },

  onUpdateProgress: function bt_onUpdateProgress(mode, evt) {
    switch (mode) {
      case 'start':
        var transferInfo = evt.detail.transferInfo;
        this.initProgress(transferInfo);
        break;

      case 'progress':
        var address = evt.address;
        var processedLength = evt.processedLength;
        var fileLength = evt.fileLength;
        var progress = 0;
        if (fileLength == 0) {
          //XXX: May need to handle unknow progress
        } else if (processedLength > fileLength) {
          // According Bluetooth spec.,
          // the processed length is a referenced value only.
          // XXX: If processed length is bigger than file length,
          //      show an unknown progress
        } else {
          progress = processedLength / fileLength;
        }
        this.updateProgress(progress, evt);
        break;
    }
  },

  initProgress: function bt_initProgress(evt) {
    var _ = navigator.mozL10n.get;
    // Create progress dynamically in notification center
    var address = evt.address;
    var transferMode =
      (evt.received == true) ?
      _('bluetooth-receiving-progress') : _('bluetooth-sending-progress');
    var content =
      '<img src="style/bluetooth_transfer/images/transfer.png" />' +
      '<div class="bluetooth-transfer-progress">' + transferMode + '</div>' +
      // XXX: Bug 804533 - [Bluetooth]
      // Need sending/receiving icon for Bluetooth file transfer
      '<progress value="0" max="1"></progress>';

    var transferTask = document.createElement('div');
    transferTask.id = 'bluetooth-transfer-status';
    transferTask.className = 'notification';
    transferTask.setAttribute('data-id', address);
    transferTask.innerHTML = content;
    transferTask.addEventListener('click',
                                  this.onCancelTransferTask.bind(this));
    this.transferStatusList.appendChild(transferTask);
  },

  updateProgress: function bt_updateProgress(value, evt) {
    var address = evt.address;
    var id = 'div[data-id="' + address + '"] progress';
    var progressEl = this.transferStatusList.querySelector(id);
    progressEl.value = value;
  },

  removeProgress: function bt_removeProgress(evt) {
    var address = evt.address;
    var id = 'div[data-id="' + address + '"]';
    var finishedTask = this.transferStatusList.querySelector(id);
    finishedTask.removeEventListener('click',
                                     this.onCancelTransferTask.bind(this));
    this.transferStatusList.removeChild(finishedTask);
  },

  showBanner: function bt_showBanner(isComplete) {
    var _ = navigator.mozL10n.get;
    var status = (isComplete) ? 'complete' : 'failed';
    this.banner.addEventListener('animationend', function animationend() {
      this.banner.removeEventListener('animationend', animationend);
      this.banner.classList.remove('visible');
    }.bind(this));
    this.bannerContainer.textContent = _('bluetooth-file-transfer-result',
      { status: status });
    this.banner.classList.add('visible');
  },

  onCancelTransferTask: function bt_onCancelTransferTask(evt) {
    var id = evt.target.dataset.id;
    // Show confirm dialog for user to cancel transferring task
    UtilityTray.hide();
    this.showCancelTransferPrompt(id);
  },

  showCancelTransferPrompt: function bt_showCancelTransferPrompt(address) {
    var _ = navigator.mozL10n.get;

    var cancel = {
      title: _('continue'),
      callback: this.continueTransfer.bind(this)
    };

    var confirm = {
      title: _('cancel'),
      callback: this.cancelTransfer.bind(this, address)
    };

    CustomDialog.show(_('cancelFileTransfer'), _('cancelFileTransfer'),
                      cancel, confirm);
  },

  continueTransfer: function bt_continueTransfer() {
    CustomDialog.hide();
  },

  cancelTransfer: function bt_cancelTransfer(address) {
    CustomDialog.hide();
    var adapter = Bluetooth.getAdapter();
    if (adapter != null) {
      adapter.stopSendingFile(address);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  onTransferComplete: function bt_onTransferComplete(evt) {
    var transferInfo = evt.detail.transferInfo;
    var _ = navigator.mozL10n.get;
    // Remove transferring progress
    this.removeProgress(transferInfo);
    var fileName =
      (transferInfo.fileName) ? transferInfo.fileName : _('unknown-file');
    var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';
    // Show banner and notification
    if (transferInfo.success == true) {
       // Show completed message of transferred result on the banner
      this.showBanner(true);
      if (transferInfo.received) {
        // Received file can be opened only
        // TODO: Need to modify the icon after visual provide
        NotificationHelper.send(_('transferFinished-receivedSuccessful-title'),
                                fileName,
                                icon,
                                this.openReceivedFile.bind(this, transferInfo));
      } else {
        NotificationHelper.send(_('transferFinished-sentSuccessful-title'),
                                fileName,
                                icon);
      }
    } else {
      // Show failed message of transferred result on the banner
      this.showBanner(false);
      if (transferInfo.received) {
        NotificationHelper.send(_('transferFinished-receivedFailed-title'),
                                fileName,
                                icon);
      } else {
        NotificationHelper.send(_('transferFinished-sentFailed-title'),
                                fileName,
                                icon);
      }
    }
  },

  openReceivedFile: function bt_openReceivedFile(evt) {
    // Launch the gallery with an open activity to view this specific photo
    // XXX: The prefix file path should be refined when API is ready to provide
    var filePath = 'downloads/bluetooth/' + evt.fileName;
    var contentType = evt.contentType;
    var storageType = 'sdcard';
    var self = this;
    var storage = navigator.getDeviceStorage(storageType);
    var getreq = storage.get(filePath);

    getreq.onerror = function() {
      var msg = 'failed to get file:' +
                filePath + getreq.error.name +
                getreq.error.name;
      self.debug(msg);
    };

    getreq.onsuccess = function() {
      var file = getreq.result;
      // When we got the file by storage type of "sdcard"
      // use the file.type to replace the empty fileType which is given by API
      var fileType = '';
      var fileName = file.name;
      if (contentType != '' && contentType != 'image/*') {
        fileType = contentType;
      } else {
        var fileNameExtension =
          fileName.substring(fileName.lastIndexOf('.') + 1);
        if (file.type != '') {
          fileType = file.type;
          // Refine the file type to "audio/ogg" when the file format is *.ogg
          if (fileType == 'video/ogg' &&
              (fileNameExtension.indexOf('ogg') != -1)) {
            fileType == 'audio/ogg';
          }
        } else {
          // Parse Filename Extension to find out MIMETYPE
          fileType = self.getMimetype(fileNameExtension);
        }
      }

      var a = new MozActivity({
        name: 'open',
        data: {
          type: fileType,
          blob: file,
          // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=812098
          // Pass the file name for Music APP since it can not open blob
          filename: file.name
        }
      });

      a.onerror = function(e) {
        var msg = 'open activity error:' + a.error.name;
        self.debug(msg);
        // Cannot identify MIMETYPE
        // So, show cannot open file dialog with unknow media type
        UtilityTray.hide();
        self.showUnknownMediaPrompt(fileName);
      };
      a.onsuccess = function(e) {
        var msg = 'open activity onsuccess';
        self.debug(msg);
      };
    };
  },

  getMimetype: function bt_getMimetype(fileNameExtension) {
    return FileFormats[fileNameExtension];
  },

  showUnknownMediaPrompt: function bt_showUnknownMediaPrompt(fileName) {
    var _ = navigator.mozL10n.get;
    var confirm = {
      title: _('confirm'),
      callback: function() {
        CustomDialog.hide();
      }
    };

    var body = _('unknownMediaTypeToOpen') + ' ' + fileName;
    CustomDialog.show(_('cannotOpenFile'), body, confirm);
  }
};

BluetoothTransfer.init();
