/* API Summary:
   stopSendingFile(in DOMString aDeviceAddress);
   confirmReceivingFile(in DOMString aDeviceAddress, in bool aConfirmation); */
/* global bluetooth, NotificationHelper, UtilityTray, NfcHandoverManager,
   CustomDialog, MimeMapper, MozActivity */
'use strict';

(function(exports) {
  var BluetoothTransfer = function() {
    /**
     * Bluetooth pair list
     *
     * @public
     * @type {Object} pair list
     */
    this.pairList = {
      index: []
    };
    // The first-in-first-out queue maintain each scheduled sending task.
    // Each element is a object for scheduled sending tasks.
    this._sendingFilesQueue = [];
    this._deviceStorage = navigator.getDeviceStorage('sdcard');
    this._debug = true;
    this._elements = null;
  };

  BluetoothTransfer.prototype = {
    get _transferStatusList() {
      delete this._elements.transferStatusList;
      this._elements.transferStatusList =
        document.getElementById('bluetooth-transfer-status-list');
      return this._elements.transferStatusList;
    },

    /**
     * Initialization
     */
    start: function bt_init() {
      this._elements = {
        screen: document.getElementById('screen'),
        transferStatusList:
          document.getElementById('bluetooth-transfer-status-list')
      };

      // Bind message handler for sending files from Bluetooth app
      window.addEventListener('iac-bluetoothTransfercomms', this);
      // Listen to 'bluetooth-opp-transfer-start' from bluetooth.js
      window.addEventListener('bluetooth-opp-transfer-start', this);
      // Listen to 'bluetooth-opp-transfer-complete' from bluetooth.js
      window.addEventListener('bluetooth-opp-transfer-complete', this);

      // Bind message handler for transferring file callback
      navigator.mozSetMessageHandler(
        'bluetooth-opp-receiving-file-confirmation',
        this._onReceivingFileConfirmation.bind(this)
      );

      navigator.mozSetMessageHandler('bluetooth-opp-update-progress',
        this._onUpdateProgress.bind(this, 'progress')
      );
    },

    handleEvent: function bt_handleEvent(evt) {
      switch (evt.type) {
        case 'iac-bluetoothTransfercomms':
          this._onFilesSending();
          break;
        case 'bluetooth-opp-transfer-start':
          this._onUpdateProgress('start');
          break;
        case 'bluetooth-opp-transfer-complete':
          this._onTransferComplete();
          break;
      }
    },

    _getDeviceName: function bt_getDeviceName(address) {
      var _ = navigator.mozL10n.get;
      var length = this.pairList.index.length;
      for (var i = 0; i < length; i++) {
        if (this.pairList.index[i].address === address) {
          return this.pairList.index[i].name;
        }
      }
      return _('unknown-device');
    },

    _getPairedDevice: function bt_getPairedDevice(callback) {
      var _adapter = Bluetooth.getAdapter();
      if (_adapter == null) {
        var msg = 'Cannot get Bluetooth adapter.';
        this.debug(msg);
        return;
      }
      var self = this;
      var req = _adapter.getPairedDevices();
      req.onsuccess = function bt_getPairedSuccess() {
        self.pairList.index = req.result;
        var length = self.pairList.index.length;
        if (length === 0) {
          var msg = 'There is no paired device! ' +
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

    debug: function bt_debug(msg) {
      if (!this._debug) {
        return;
      }

      console.log('[System Bluetooth Transfer]: ' + msg);
    },

    _humanizeSize: function bt_humanizeSize(bytes) {
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

    _onFilesSending: function bt_onFilesSending(evt) {
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
      this._sendingFilesQueue.push(evt.detail);
      var msg = 'push sending files request in queue, queued length = ' +
        this._sendingFilesQueue.length;
      this.debug(msg);
    },

    _onReceivingFileConfirmation:
      function bt_onReceivingFileConfirmation(evt) {
        if (NfcHandoverManager.isHandoverInProgress()) {
          // Bypassing confirm dialog while incoming file
          // transfer via NFC Handover
          this.debug('Incoming file via NFC Handover. ' +
            'Bypassing confirm dialog');
          NfcHandoverManager.transferStarted();
          this._acceptReceive(evt);
          return;
        }

        // Prompt appears when a transfer request from a
        // paired device is received.
        var _ = navigator.mozL10n.get;

        var address = evt.address;
        var self = this;
        var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';

        this._getPairedDevice(function getPairedDeviceComplete() {
          var deviceName = self._getDeviceName(address);
          NotificationHelper.send(_('transfer-confirmation-title',
            { deviceName: deviceName }),
            _('transfer-confirmation-description'),
            icon,
            function() {
              UtilityTray.hide();
              self._showReceivePrompt(evt);
            });
        });
    },

    _showReceivePrompt: function bt_showReceivePrompt(evt) {

      var address = evt.address;
      var fileName = evt.fileName;
      var fileSize = this._humanizeSize(evt.fileLength);
      var cancel = {
        title: 'deny',
        callback: this._declineReceive.bind(this, address)
      };

      var confirm = {
        title: 'transfer',
        callback: this._acceptReceive.bind(this, evt),
        recommend: true
      };

      var deviceName = '';
      var screen = this._elements.screen;
      this._getPairedDevice(function getPairedDeviceComplete() {
        deviceName = this._getDeviceName(address);
        CustomDialog.show(
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
        )
        .setAttribute('data-z-index-level', 'system-dialog');
      }.bind(this));
    },

    _declineReceive: function bt_declineReceive(address) {
      CustomDialog.hide();
      var _adapter = Bluetooth.getAdapter();
      if (_adapter != null) {
        _adapter.confirmReceivingFile(address, false);
      } else {
        var msg = 'Cannot get adapter from system Bluetooth monitor.';
        this.debug(msg);
      }
    },

    _acceptReceive: function bt_acceptReceive(evt) {
      CustomDialog.hide();
      // Check storage is available or not before confirm receiving file
      var address = evt.address;
      var fileSize = evt.fileLength;
      var self = this;
      this._checkStorageSpace(fileSize,
        function checkStorageSpaceComplete(isStorageAvailable, errorMessage) {
          var _adapter = Bluetooth.getAdapter();
          var option = (isStorageAvailable) ? true : false;
          if (_adapter) {
            _adapter.confirmReceivingFile(address, option);
          } else {
            var msg = 'Cannot get adapter from system Bluetooth monitor.';
            self.debug(msg);
          }
          // Storage is not available, then pop out a prompt with the reason
          if (!isStorageAvailable) {
            self._showStorageUnavaliablePrompt(errorMessage);
          }
      });
    },

    _showStorageUnavaliablePrompt:
      function bt_showStorageUnavaliablePrompt(msg) {
        var confirm = {
          title: 'confirm',
          callback: function() {
            CustomDialog.hide();
          }
        };

        var body = msg;
        var screen = this._elements.screen;
        CustomDialog.show('cannotReceiveFile', body, confirm, null, screen)
          .setAttribute('data-z-index-level', 'system-dialog');
    },

    _checkStorageSpace: function bt_checkStorageSpace(fileSize, callback) {
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

    /**
     * Check if SendFile queue is empty.
     *
     * @public
     */
    get isSendFileQueueEmpty() {
      return this._sendingFilesQueue.length === 0;
    },

    /**
     * Send file via nfc handover.
     *
     * @public
     * @param  {String} mac mac address
     * @param  {Blob} blob blob file
     */
    sendFileViaHandover: function bt_sendFileViaHandover(mac, blob) {
      var _adapter = Bluetooth.getAdapter();
      if (_adapter != null) {
        var sendingFilesSchedule = {
          viaHandover: true,
          numberOfFiles: 1,
          numSuccessful: 0,
          numUnsuccessful: 0
        };
        this._onFilesSending({detail: sendingFilesSchedule});
        // XXX: Bug 915602 - [Bluetooth] Call sendFile api will crash
        // the system while device is just paired.
        // The paired device is ready to send file.
        // Since above issue is existed, we use a setTimeout with 3 secs delay
        var waitConnectionReadyTimeoutTime = 3000;
        setTimeout(function() {
          _adapter.sendFile(mac, blob);
        }, waitConnectionReadyTimeoutTime);
      } else {
        var msg = 'Cannot get adapter from system Bluetooth monitor.';
        this.debug(msg);
      }
    },

    _onUpdateProgress: function bt_onUpdateProgress(mode, evt) {
      switch (mode) {
        case 'start':
          var transferInfo = evt.detail.transferInfo;
          this._initProgress(transferInfo);
          break;

        case 'progress':
          var processedLength = evt.processedLength;
          var fileLength = evt.fileLength;
          var progress = 0;
          if (fileLength === 0) {
            //XXX: May need to handle unknow progress
          } else if (processedLength > fileLength) {
            // According Bluetooth spec.,
            // the processed length is a referenced value only.
            // XXX: If processed length is bigger than file length,
            //      show an unknown progress
          } else {
            progress = processedLength / fileLength;
          }
          this._updateProgress(progress, evt);
          break;
      }
    },

    _initProgress: function bt_initProgress(evt) {
      var _ = navigator.mozL10n.get;
      // Create progress dynamically in notification center
      var address = evt.address;
      var transferMode = (evt.received === true) ?
        _('bluetooth-receiving-progress') : _('bluetooth-sending-progress');
      var content =
        '<div data-icon="bluetooth-transfer-circle"></div>' +
        '<div class="title-container">' + transferMode + '</div>' +
        // XXX: Bug 804533 - [Bluetooth]
        // Need sending/receiving icon for Bluetooth file transfer
        '<progress value="0" max="1"></progress>';

      var transferTask = document.createElement('div');
      transferTask.id = 'bluetooth-transfer-status';
      transferTask.className = 'fake-notification';
      transferTask.setAttribute('data-id', address);
      transferTask.setAttribute('role', 'link');
      transferTask.innerHTML = content;
      transferTask.addEventListener('click',
        this._onCancelTransferTask.bind(this));
      this._elements.transferStatusList.appendChild(transferTask);
    },

    _updateProgress: function bt_updateProgress(value, evt) {
      var address = evt.address;
      var id = 'div[data-id="' + address + '"] progress';
      var progressEl = this._elements.transferStatusList.querySelector(id);
      progressEl.value = value;
    },

    _removeProgress: function bt_removeProgress(evt) {
      var address = evt.address;
      var id = 'div[data-id="' + address + '"]';
      var finishedTask = this._elements.transferStatusList.querySelector(id);
      // If we decline receiving file, Bluetooth won't callback
      // 'bluetooth-opp-transfer-start',
      // 'bluetooth-opp-update-progress' event.
      // So that there is no progress element which was
      // created on notification.
      // There is only 'bluetooth-opp-transfer-complete' event to
      // notify Gaia the transferring request in failed case.
      if (finishedTask == null) {
        return;
      }

      finishedTask.removeEventListener('click',
        this._onCancelTransferTask.bind(this));
      this._elements.transferStatusList.removeChild(finishedTask);
    },

    _onCancelTransferTask: function bt_onCancelTransferTask(evt) {
      var id = evt.target.dataset.id;
      // Show confirm dialog for user to cancel transferring task
      UtilityTray.hide();
      this._showCancelTransferPrompt(id);
    },

    _showCancelTransferPrompt: function bt_showCancelTransferPrompt(address) {
      var cancel = {
        title: 'continueFileTransfer',
        callback: this._continueTransfer.bind(this)
      };

      var confirm = {
        title: 'cancel',
        callback: this._cancelTransfer.bind(this, address)
      };

      var screen = this._elements.screen;
      CustomDialog.show(
        'cancelFileTransfer',
        'cancelFileTransfer',
        cancel,
        confirm,
        screen
      )
      .setAttribute('data-z-index-level', 'system-dialog');
    },

    _continueTransfer: function bt_continueTransfer() {
      CustomDialog.hide();
    },

    _cancelTransfer: function bt_cancelTransfer(address) {
      CustomDialog.hide();
      var _adapter = Bluetooth.getAdapter();
      if (_adapter != null) {
        _adapter.stopSendingFile(address);
      } else {
        var msg = 'Cannot get adapter from system Bluetooth monitor.';
        this.debug(msg);
      }
    },

    _onTransferComplete: function bt_onTransferComplete(evt) {
      var transferInfo = evt.detail.transferInfo;
      var _ = navigator.mozL10n.get;
      // Remove transferring progress
      this._removeProgress(transferInfo);
      var fileName =
        (transferInfo.fileName) ? transferInfo.fileName : _('unknown-file');
      var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';
      // Show notification
      if (transferInfo.success === true) {
        if (transferInfo.received) {
          // Received file can be opened only
          NotificationHelper.send(
            _('transferFinished-receivedSuccessful-title'),
            fileName, icon,
            this._openReceivedFile.bind(this, transferInfo));
        } else {
          NotificationHelper.send(
            _('transferFinished-sentSuccessful-title'),
            fileName, icon);
        }
      } else {
        if (transferInfo.received) {
          NotificationHelper.send(
            _('transferFinished-receivedFailed-title'),
            fileName, icon);
        } else {
          NotificationHelper.send(
            _('transferFinished-sentFailed-title'),
            fileName, icon);
        }
      }

      var viaHandover = false;
      if (this._sendingFilesQueue.length > 0) {
        viaHandover = this._sendingFilesQueue[0].viaHandover || false;
      }

      // Have a report notification for sending multiple files.
      this._summarizeSentFilesReport(transferInfo);

      // Inform NfcHandoverManager that the transfer completed
      var details = {received: transferInfo.received,
                     success: transferInfo.success,
                     viaHandover: viaHandover};
      NfcHandoverManager.transferComplete(details);
    },

    _summarizeSentFilesReport:
      function bt_summarizeSentFilesReport(transferInfo) {
        var _ = navigator.mozL10n.get;

        // Ignore received files
        if (transferInfo.received) {
          return;
        }

        // Consumer: System app consume each sending file request
        // from Bluetooth app
        var msg = 'remove the finished sending task from queue, ' +
          'queue length = ';
        var successful = transferInfo.success;
        var sendingFilesSchedule = this._sendingFilesQueue[0];
        var numberOfFiles = sendingFilesSchedule.numberOfFiles;
        // The scheduled task is for sent one file only.
        if (numberOfFiles == 1) {
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

    _openReceivedFile: function bt_openReceivedFile(evt) {
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
            UtilityTray.hide();
            // Cannot identify MIMETYPE
            // So, show cannot open file dialog with unknow media type
            self._showUnknownMediaPrompt(fileName);
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

    _showUnknownMediaPrompt: function bt_showUnknownMediaPrompt(fileName) {
      var confirm = {
        title: 'confirm',
        callback: function() {
          CustomDialog.hide();
        }
      };

      var screen = this._elements.screen;
      var body = {id: 'unknownMediaTypeToOpenFile', args: {fileName: fileName}};
      CustomDialog.show('cannotOpenFile', body, confirm, null, screen)
        .setAttribute('data-z-index-level', 'system-dialog');
    }
  };

  exports.BluetoothTransfer = BluetoothTransfer;
}(window));
