/* API Summary:
   stopSendingFile(in DOMString aDeviceAddress);
   confirmReceivingFile(in DOMString aDeviceAddress, in bool aConfirmation); */
/* global CustomDialog */
'use strict';

(function(exports) {
  var BluetoothTransfer = function(bluetooth) {
    this.bluetooth = bluetooth;
  };
  BluetoothTransfer.EVENTS = ['iac-bluetoothTransfercomms'];
  BluetoothTransfer.SYSTEM_MESSAGES = [
    'bluetooth-opp-receiving-file-confirmation'
  ];
  BluetoothTransfer.SUB_MODULES = ['NfcHandoverManager'];
  BluetoothTransfer.prototype = Object.create(BaseModule.prototype,
    {
      transferStatusList: {
        configurable: false,
        get: function() {
          delete this.transferStatusList;
          return this.transferStatusList =
            document.getElementById('bluetooth-transfer-status-list');
        }
      }
    });
  BluetoothTransfer.prototype.constructor = BluetoothTransfer;
  var prototype = {
    name: 'BluetoothTransfer',
    pairList: {
      index: []
    },
    // The first-in-first-out queue maintain each scheduled sending task.
    // Each element is a object for scheduled sending tasks.
    _sendingFilesQueue: [],
    _deviceStorage: navigator.getDeviceStorage('sdcard'),
    _debug: false,

    '_handle_iac-bluetoothTransfercomms': function(evt) {
      this.onFilesSending(evt);
    },
    '_watch_bluetooth-opp-receiving-file-confirmation': function() {
      this.onReceivingFileConfirmation.call(this, arguments);
    },
    '_handle_bluetooth-opp-transfer-start': function(evt) {
      this.onUpdateProgress('start');
    },
    '_handle_bluetooth-opp-update-progress': function(evt) {
      this.onUpdateProgress('progress');
    },
    '_handle_bluetooth-opp-transfer-complete': function(evt) {
      this.onTransferComplete(evt);
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
      var adapter = this.bluetooth.getAdapter();
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
            'There is no paired device! ' +
            'Please pair your bluetooth device first.';
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

    humanizeSize: function(bytes) {
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

    onFilesSending: function(evt) {
      var _ = navigator.mozL10n.get;

      // Notify user that we are sending files
      var icon = 'style/bluetooth_transfer/images/transfer.png';
      NotificationHelper.send(_('transfer-has-started-title'),
                              _('transfer-has-started-description'),
                              icon,
                              function() {
                                UtilityTray.show();
                              });

      // Push sending files request in queue
      var sendingFilesSchedule = evt.detail;
      this._sendingFilesQueue.push(sendingFilesSchedule);
      var msg = 'push sending files request in queue, queued length = ' +
                this._sendingFilesQueue.length;
      this.debug(msg);
    },

    onReceivingFileConfirmation: function(evt) {
      if (this.nfcHandoverManager.isHandoverInProgress()) {
        // Bypassing confirm dialog
        // while incoming file transfer via NFC Handover
        this.debug('Incoming file via NFC Handover. Bypassing confirm dialog');
        this.nfcHandoverManager.transferStarted();
        this.acceptReceive(evt);
        return;
      }

      // Prompt appears when a transfer request
      // from a paired device is received.
      var _ = navigator.mozL10n.get;

      var address = evt.address;
      var fileSize = evt.fileLength;
      var self = this;
      var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';

      this.getPairedDevice(function() {
        var deviceName = self.getDeviceName(address);
        NotificationHelper.send(_('transfer-confirmation-title',
                                { deviceName: deviceName }),
                                _('transfer-confirmation-description'),
                                icon,
                                function() {
                                  UtilityTray.hide();
                                  self.showReceivePrompt(evt);
                                });
      });
    },

    showReceivePrompt: function(evt) {
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
        callback: this.acceptReceive.bind(this, evt),
        recommend: true
      };

      var deviceName = '';
      this.getPairedDevice(function() {
        deviceName = this.getDeviceName(address);
        CustomDialog.show(_('acceptFileTransfer'),
                          _('wantToReceiveFile',
                          { deviceName: deviceName,
                            fileName: fileName,
                            fileSize: fileSize }),
                          cancel, confirm);
      }.bind(this));
    },

    declineReceive: function(address) {
      CustomDialog.hide();
      var adapter = this.bluetooth.getAdapter();
      if (adapter != null) {
        adapter.confirmReceivingFile(address, false);
      } else {
        var msg = 'Cannot get adapter from system Bluetooth monitor.';
        this.debug(msg);
      }
    },

    acceptReceive: function(evt) {
      CustomDialog.hide();
      // Check storage is available or not before confirm receiving file
      var address = evt.address;
      var fileSize = evt.fileLength;
      var self = this;
      this.checkStorageSpace(fileSize,
        function checkStorageSpaceComplete(isStorageAvailable, errorMessage) {
          var adapter = self.bluetooth.getAdapter();
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

    showStorageUnavaliablePrompt: function(msg) {
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

    checkStorageSpace: function(fileSize, callback) {
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
          callback(false, _('sdcard-not-exist2'));
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

    get isSendFileQueueEmpty() {
      return this._sendingFilesQueue.length === 0;
    },

    sendFileViaHandover: function(mac, blob) {
      var adapter = this.bluetooth.getAdapter();
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

    onUpdateProgress: function(mode, evt) {
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
        '<img src="style/bluetooth_transfer/images/transfer.png" ' +
        'role="presentation" /><div class="bluetooth-transfer-progress">' +
        transferMode + '</div>' +
        // XXX: Bug 804533 - [Bluetooth]
        // Need sending/receiving icon for Bluetooth file transfer
        '<progress value="0" max="1"></progress>';

      var transferTask = document.createElement('div');
      transferTask.id = 'bluetooth-transfer-status';
      transferTask.className = 'notification';
      transferTask.setAttribute('data-id', address);
      transferTask.setAttribute('role', 'link');
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

    removeProgress: function(evt) {
      var address = evt.address;
      var id = 'div[data-id="' + address + '"]';
      var finishedTask = this.transferStatusList.querySelector(id);
      // If we decline receiving file, Bluetooth won't callback
      // 'bluetooth-opp-transfer-start', 'bluetooth-opp-update-progress' event.
      // So that there is no progress element which was created on notification.
      // There is only 'bluetooth-opp-transfer-complete' event
      // to notify Gaia the transferring request in failed case.
      if (finishedTask == null)
        return;

      finishedTask.removeEventListener('click',
                                       this.onCancelTransferTask.bind(this));
      this.transferStatusList.removeChild(finishedTask);
    },

    onCancelTransferTask: function(evt) {
      var id = evt.target.dataset.id;
      // Show confirm dialog for user to cancel transferring task
      UtilityTray.hide();
      this.showCancelTransferPrompt(id);
    },

    showCancelTransferPrompt: function(address) {
      var _ = navigator.mozL10n.get;

      var cancel = {
        title: _('continueFileTransfer'),
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
      var adapter = this.bluetooth.getAdapter();
      if (adapter != null) {
        adapter.stopSendingFile(address);
      } else {
        var msg = 'Cannot get adapter from system Bluetooth monitor.';
        this.debug(msg);
      }
    },

    onTransferComplete: function(evt) {
      var transferInfo = evt.detail.transferInfo;
      var _ = navigator.mozL10n.get;
      // Remove transferring progress
      this.removeProgress(transferInfo);
      var fileName =
        (transferInfo.fileName) ? transferInfo.fileName : _('unknown-file');
      var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';
      // Show notification
      if (transferInfo.success == true) {
        if (transferInfo.received) {
          // Received file can be opened only
          NotificationHelper.send(
            _('transferFinished-receivedSuccessful-title'),
            fileName,
            icon,
            this.openReceivedFile.bind(this, transferInfo));
        } else {
          NotificationHelper.send(_('transferFinished-sentSuccessful-title'),
                                  fileName,
                                  icon);
        }
      } else {
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

      var viaHandover = false;
      if (this._sendingFilesQueue.length > 0) {
        viaHandover = this._sendingFilesQueue[0].viaHandover || false;
      }

      // Have a report notification for sending multiple files.
      this.summarizeSentFilesReport(transferInfo);

      // Inform NfcHandoverManager that the transfer completed
      var details = {received: transferInfo.received,
                     success: transferInfo.success,
                     viaHandover: viaHandover};
      this.nfcHandoverManager.transferComplete(details);
    },

    summarizeSentFilesReport: function(transferInfo) {
      var _ = navigator.mozL10n.get;

      // Ignore received files
      if (transferInfo.received)
        return;

      // Consumer:
      // System app consume each sending file request from Bluetooth app
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
          NotificationHelper.send(_('transferReport-title'),
                                  _('transferReport-description',
                                  { numSuccessful: numSuccessful,
                                    numUnsuccessful: numUnsuccessful }),
                                  icon);

          // Remove the finished sending task from the queue
          this._sendingFilesQueue.shift();
          msg += this._sendingFilesQueue.length;
          this.debug(msg);
        }
      }
    },

    openReceivedFile: function(evt) {
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

        var activityOptions = {
          data: {
            type: mappedType,
            blob: file,
            // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=812098
            // Pass the file name for Music APP since it can not open blob
            filename: fileName
          }
        };

        switch (mappedType) {
          case 'text/vcard':
            activityOptions.name = 'import';
            break;
          default:
            activityOptions.name = 'open';
        }
        var a = new MozActivity(activityOptions);

        a.onerror = function(e) {
          var msg = 'open activity error:' + a.error.name;
          self.debug(msg);
          switch (a.error.name) {
          case 'NO_PROVIDER':
            UtilityTray.hide();
            // Cannot identify MIMETYPE
            // So, show cannot open file dialog with unknow media type
            self.showUnknownMediaPrompt(fileName);
            return;
          case 'ActivityCanceled':
          case 'USER_ABORT':
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

    showUnknownMediaPrompt: function(fileName) {
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
  BaseModule.mixin(BluetoothTransfer.prototype, prototype);
  exports.BluetoothTransfer = BluetoothTransfer;
}(window));
