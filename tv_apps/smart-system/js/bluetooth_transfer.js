/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* API Summary:
   stopSendingFile(in DOMString aDeviceAddress);
   confirmReceivingFile(in DOMString aDeviceAddress, in bool aConfirmation); */
/* global Bluetooth, NotificationHelper, CustomDialog, MimeMapper,
          MozActivity, focusManager */
'use strict';

var BluetoothTransfer = {
  pairList: {
    index: []
  },
  // The first-in-first-out queue maintain each scheduled sending task.
  // Each element is a object for scheduled sending tasks.
  _sendingFilesQueue: [],
  _deviceStorage: navigator.getDeviceStorage('sdcard'),
  _debug: false,

  init: function bt_init() {
    // Bind message handler for sending files from Bluetooth app
    window.addEventListener('iac-bluetoothTransfercomms',
      this.onFilesSending.bind(this)
    );

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

    focusManager.addUI(this);
  },

  getDeviceName: function bt_getDeviceName(address) {
    var _ = navigator.mozL10n.get;
    var length = this.pairList.index.length;
    for (var i = 0; i < length; i++) {
      if (this.pairList.index[i].address == address) {
        return this.pairList.index[i].name;
      }
    }
    return _('unknown-device');
  },

  getPairedDevice: function bt_getPairedDevice(callback) {
    var adapter = Bluetooth.getAdapter();
    if (!adapter) {
      var msg = 'Cannot get Bluetooth adapter.';
      this.debug(msg);
      return;
    }
    var self = this;
    var req = adapter.getPairedDevices();
    req.onsuccess = function bt_getPairedSuccess() {
      self.pairList.index = req.result;
      var length = self.pairList.index.length;
      if (length === 0) {
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
    if (!this._debug) {
      return;
    }

    console.log('[System Bluetooth Transfer]: ' + msg);
  },

  closeDialog: function bt_closeDialog() {
    CustomDialog.hide();
    this.customDialog = null;
    focusManager.focus();
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

  onFilesSending: function bt_onFilesSending(evt) {

    // Notify user that we are sending files
    var icon = 'style/bluetooth_transfer/images/transfer.png';
    NotificationHelper.send('transfer-has-started-title', {
      'bodyL10n': 'transfer-has-started-description',
      'icon': icon
    });

    // Push sending files request in queue
    var sendingFilesSchedule = evt.detail;
    this._sendingFilesQueue.push(sendingFilesSchedule);
    var msg = 'push sending files request in queue, queued length = ' +
              this._sendingFilesQueue.length;
    this.debug(msg);
  },

  onReceivingFileConfirmation: function bt_onReceivingFileConfirmation(evt) {
    // Prompt appears when a transfer request from a paired device is received.

    var address = evt.address;
    var self = this;
    var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';

    this.getPairedDevice(function getPairedDeviceComplete() {
      var deviceName = self.getDeviceName(address);
      var msg = {
        'id': 'transfer-confirmation-title',
        'args': { deviceName: deviceName }
      };
      NotificationHelper.send(msg, {
        'bodyL10n': 'transfer-confirmation-description',
        'icon': icon
      }).then(function(notification) {
        notification.onclick = function() {
          self.showReceivePrompt(evt);
        };
      });
    });
  },

  showReceivePrompt: function bt_showReceivePrompt(evt) {

    var address = evt.address;
    var fileName = evt.fileName;
    var fileSize = this.humanizeSize(evt.fileLength);
    var cancel = {
      title: 'deny',
      callback: this.declineReceive.bind(this, address)
    };

    var confirm = {
      title: 'transfer',
      callback: this.acceptReceive.bind(this, evt),
      recommend: true
    };

    var deviceName = '';
    var screen = document.getElementById('screen');
    this.getPairedDevice(function getPairedDeviceComplete() {
      deviceName = this.getDeviceName(address);
      this.customDialog = CustomDialog.show(
        'acceptFileTransfer',
        {
          id: 'wantToReceiveFile',
          args: {
            deviceName: deviceName,
            fileName: fileName,
            fileSize: fileSize
          }
        },
        cancel,
        confirm,
        screen
      );
      this.customDialog.setAttribute('data-z-index-level', 'system-dialog');
      focusManager.focus();
    }.bind(this));
  },

  declineReceive: function bt_declineReceive(address) {
    this.closeDialog();
    var adapter = Bluetooth.getAdapter();
    if (adapter != null) {
      adapter.confirmReceivingFile(address, false);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  acceptReceive: function bt_acceptReceive(evt) {
    this.closeDialog();
    // Check storage is available or not before confirm receiving file
    var address = evt.address;
    var fileSize = evt.fileLength;
    var self = this;
    this.checkStorageSpace(fileSize,
      function checkStorageSpaceComplete(isStorageAvailable, errorMessage) {
        var adapter = Bluetooth.getAdapter();
        var option = (isStorageAvailable) ? true : false;
        if (adapter) {
          adapter.confirmReceivingFile(address, option);
        } else {
          var msg = 'Cannot get adapter from system Bluetooth monitor.';
          self.debug(msg);
        }
        // Storage is not available, then pop out a prompt with the reason
        if (!isStorageAvailable) {
          self.showStorageUnavaliablePrompt(errorMessage);
        }
    });
  },

  showStorageUnavaliablePrompt: function bt_showStorageUnavaliablePrompt(msg) {
    var confirm = {
      title: 'confirm',
      callback: function() {
        this.closeDialog();
      }.bind(this)
    };

    var body = msg;
    var screen = document.getElementById('screen');
    this.customDialog = CustomDialog.show(
      'cannotReceiveFile',
      body,
      confirm,
      null,
      screen
    );
    this.customDialog.setAttribute('data-z-index-level', 'system-dialog');
    focusManager.focus();
  },

  checkStorageSpace: function bt_checkStorageSpace(fileSize, callback) {
    if (!callback) {
      return;
    }

    var storage = this._deviceStorage;

    var availreq = storage.available();
    availreq.onsuccess = function(e) {
      switch (availreq.result) {
      case 'available':
        // skip down to the code below
        break;
      case 'unavailable':
        callback(false, 'sdcard-not-exist2');
        return;
      case 'shared':
        callback(false, 'sdcard-in-use');
        return;
      default:
        callback(false, 'unknown-error');
        return;
      }

      // If we get here, then the sdcard is available, so we need to find out
      // if there is enough free space on it
      var freereq = storage.freeSpace();
      freereq.onsuccess = function() {
        if (freereq.result >= fileSize) {
          callback(true, '');
        } else {
          callback(false, 'sdcard-no-space2');
        }
      };
      freereq.onerror = function() {
        callback(false, 'cannotGetStorageState');
      };
    };

    availreq.onerror = function(e) {
      callback(false, 'cannotGetStorageState');
    };
  },

  get isSendFileQueueEmpty() {
    return this._sendingFilesQueue.length === 0;
  },

  sendFileViaHandover: function bt_sendFileViaHandover(mac, blob) {
    var adapter = Bluetooth.getAdapter();
    if (adapter != null) {
      var sendingFilesSchedule = {
        viaHandover: true,
        numberOfFiles: 1,
        numSuccessful: 0,
        numUnsuccessful: 0
      };
      this.onFilesSending({detail: sendingFilesSchedule});
      // XXX: Bug 915602 - [Bluetooth] Call sendFile api will crash
      // the system while device is just paired.
      // The paired device is ready to send file.
      // Since above issue is existed, we use a setTimeout with 3 secs delay
      var waitConnectionReadyTimeoutTime = 3000;
      setTimeout(function() {
        adapter.sendFile(mac, blob);
      }, waitConnectionReadyTimeoutTime);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  onUpdateProgress: function bt_onUpdateProgress(mode, evt) {
    switch (mode) {
      case 'start':
        this.debug('transfer start');
        break;

      case 'progress':
        this.debug('transfer progress: ' + evt.processedLength + ' / ' +
                   evt.fileLength);
        break;
    }
  },

  onCancelTransferTask: function bt_onCancelTransferTask(evt) {
    var id = evt.target.dataset.id;
    // Show confirm dialog for user to cancel transferring task
    this.showCancelTransferPrompt(id);
  },

  showCancelTransferPrompt: function bt_showCancelTransferPrompt(address) {
    var cancel = {
      title: 'continueFileTransfer',
      callback: this.continueTransfer.bind(this)
    };

    var confirm = {
      title: 'cancel',
      callback: this.cancelTransfer.bind(this, address)
    };

    var screen = document.getElementById('screen');

    this.customDialog = CustomDialog.show(
      'cancelFileTransfer',
      'cancelFileTransfer',
      cancel,
      confirm,
      screen
    );
    this.customDialog.setAttribute('data-z-index-level', 'system-dialog');
    focusManager.focus();
  },

  continueTransfer: function bt_continueTransfer() {
    this.closeDialog();
  },

  cancelTransfer: function bt_cancelTransfer(address) {
    this.closeDialog();
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
    var fileName =
      (transferInfo.fileName) ? transferInfo.fileName : 'unknown-file';
    var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';
    // Show notification
    if (transferInfo.success === true) {
      if (transferInfo.received) {
        // Received file can be opened only
        NotificationHelper.send('transferFinished-receivedSuccessful-title', {
          'fileName': fileName,
          'icon': icon
        }).then(function(notification) {
          notification.onclick = function() {
            this.openReceivedFile(transferInfo);
          }.bind(this);
        }.bind(this));
      } else {
        NotificationHelper.send('transferFinished-sentSuccessful-title', {
          'fileName': fileName,
          'icon': icon
        });
      }
    } else {
      if (transferInfo.received) {
        NotificationHelper.send('transferFinished-receivedFailed-title', {
          'fileName': fileName,
          'icon': icon
        });
      } else {
        NotificationHelper.send('transferFinished-sentFailed-title', {
          'fileName': fileName,
          'icon': icon
        });
      }
    }

    var viaHandover = false;
    if (this._sendingFilesQueue.length > 0) {
      viaHandover = this._sendingFilesQueue[0].viaHandover || false;
    }

    // Have a report notification for sending multiple files.
    this.summarizeSentFilesReport(transferInfo);
  },

  summarizeSentFilesReport: function bt_summarizeSentFilesReport(transferInfo) {

    // Ignore received files
    if (transferInfo.received) {
      return;
    }

    // Consumer: System app consume each sending file request from Bluetooth app
    var msg = 'remove the finished sending task from queue, queue length = ';
    var successful = transferInfo.success;
    var sendingFilesSchedule = this._sendingFilesQueue[0];
    var numberOfFiles = sendingFilesSchedule.numberOfFiles;
    if (numberOfFiles == 1) { // The scheduled task is for sent one file only.
      // We don't need to summarize a report for sent one file only.
      // Remove the finished sending task from the queue
      this._sendingFilesQueue.shift();
      msg += this._sendingFilesQueue.length;
      this.debug(msg);
    } else { // The scheduled task is for sent multiple files.
      // Create a report in notification.
      // Record each transferring report.
      if (successful) {
        this._sendingFilesQueue[0].numSuccessful++;
      } else {
        this._sendingFilesQueue[0].numUnsuccessful++;
      }

      var numSuccessful = this._sendingFilesQueue[0].numSuccessful;
      var numUnsuccessful = this._sendingFilesQueue[0].numUnsuccessful;
      if ((numSuccessful + numUnsuccessful) == numberOfFiles) {
        // In this item of queue, all files were sent completely.
        var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';
        var description = { 'id': 'transferReport-description',
          'args':  { numSuccessful: numSuccessful,
            numUnsuccessful: numUnsuccessful
          }
        };

        NotificationHelper.send('transferReport-title', {
          'bodyL10n': description,
          'icon': icon
        });
        // Remove the finished sending task from the queue
        this._sendingFilesQueue.shift();
        msg += this._sendingFilesQueue.length;
        this.debug(msg);
      }
    }
  },

  openReceivedFile: function bt_openReceivedFile(evt) {
    // Launch the gallery with an open activity to view this specific photo
    // XXX: Bug 897434 - Save received/downloaded files in one specific folder
    // with meaningful path and filename
    var filePath = 'Download/Bluetooth/' + evt.fileName;
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
      var fileName = file.name;
      var extension = fileName.split('.').pop();
      var originalType = file.type || contentType;
      var mappedType = (MimeMapper.isSupportedType(originalType)) ?
        originalType : MimeMapper.guessTypeFromExtension(extension);

      var a = new MozActivity({
        name: mappedType == 'text/vcard' ? 'import' : 'open',
        data: {
          type: mappedType,
          blob: file,
          // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=812098
          // Pass the file name for Music APP since it can not open blob
          filename: fileName
        }
      });

      a.onerror = function(e) {
        var msg = 'open activity error:' + a.error.name;
        self.debug(msg);
        switch (a.error.name) {
        case 'NO_PROVIDER':
          // Cannot identify MIMETYPE
          // So, show cannot open file dialog with unknow media type
          self.showUnknownMediaPrompt(fileName);
          return;
        case 'ActivityCanceled':
        case 'USER_ABORT':
        /* falls through */
        default:
          return;
        }
      };
      a.onsuccess = function(e) {
        var msg = 'open activity onsuccess';
        self.debug(msg);
      };
    };
  },

  showUnknownMediaPrompt: function bt_showUnknownMediaPrompt(fileName) {
    var confirm = {
      title: 'confirm',
      callback: function() {
        this.closeDialog();
      }.bind(this)
    };

    var screen = document.getElementById('screen');
    var body = {id: 'unknownMediaTypeToOpenFile', args: {fileName: fileName}};
    this.customDialog = CustomDialog.show(
      'cannotOpenFile',
      body,
      confirm,
      null,
      screen
    );
    this.customDialog.setAttribute('data-z-index-level', 'system-dialog');
    focusManager.focus();
  },

  isFocusable: function bt_isFocusable() {
    return !!this.customDialog;
  },

  getElement: function bt_getOrder() {
    if (this.isFocusable()) {
      return this.customDialog;
    }
  },

  focus: function bt_focus() {
    if (this.isFocusable()) {
      // confirm button may not be shown in custom dialog, so focusing cancel
      // button is better to handle all cases.
      document.activeElement.blur();
      this.customDialog.querySelector('#dialog-no').focus();
    }
  }

};

BluetoothTransfer.init();
