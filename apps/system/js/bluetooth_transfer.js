/* API Summary:
   stopSendingFile(in DOMString aDeviceAddress);
   confirmReceivingFile(in DOMString aDeviceAddress, in bool aConfirmation); */
'use strict';
/* global MimeMapper, Service, LazyLoader,
          MozActivity, NotificationHelper, UtilityTray */
/* exported BluetoothTransfer */
(function(exports) {
var BluetoothTransfer = {
  name: 'BluetoothTransfer',
  // The first-in-first-out queue maintain each scheduled sending task.
  // Each element is a object for scheduled sending tasks.
  _sendingFilesQueue: [],

  /**
   * Debug message.
   *
   * @private
   * @type {Boolean} turn on/off the console log
   */
  onDebug: false,

  get _deviceStorage() {
    return navigator.getDeviceStorage('sdcard');
  },

  get transferStatusList() {
    var transferStatusList =
      document.getElementById('bluetooth-transfer-status-list');
    delete this.transferStatusList;
    this.transferStatusList = transferStatusList;
    return transferStatusList;
  },

  /**
   * Initialize BluetoothTransfer module.
   *
   * @public
   */
  start: function bt_start() {
    // Bind message handler for sending files from Bluetooth app
    window.addEventListener('iac-bluetoothTransfercomms',
      this._onFilesSending.bind(this)
    );

    // Bind message handler for transferring file callback
    navigator.mozSetMessageHandler(
      'bluetooth-opp-receiving-file-confirmation',
      this.onReceivingFileConfirmation.bind(this)
    );

    // Listen to 'bluetooth-opp-transfer-start' from bluetooth.js
    window.addEventListener('bluetooth-opp-transfer-start',
      this._onUpdateProgress.bind(this, 'start')
    );

    navigator.mozSetMessageHandler('bluetooth-opp-update-progress',
      this._onUpdateProgress.bind(this, 'progress')
    );

    // Listen to 'bluetooth-opp-transfer-complete' from bluetooth.js
    window.addEventListener('bluetooth-opp-transfer-complete',
      this._onTransferComplete.bind(this));

    window.addEventListener('bluetooth-sendfile-via-handover',
      this.sendFileViaHandover.bind(this));

    Service.registerState('isSendFileQueueEmpty', this);
    Service.registerState('isFileTransferInProgress', this);
  },

  getDeviceName: function bt_getDeviceName(address) {
    return new Promise((resolve) => {
      var _ = navigator.mozL10n.get;
      var adapter = Service.query('Bluetooth.getAdapter');
      if (adapter === null) {
        var msg = 'Since cannot get Bluetooth adapter, ' +
                  'resolve with an unknown device.';
        this.debug(msg);
        resolve(_('unknown-device'));
      }
      // Service Class Name: OBEXObjectPush, UUID: 0x1105
      // Specification: Object Push Profile (OPP)
      //   NOTE: Used as both Service Class Identifier and Profile.
      // Allowed Usage: Service Class/Profile
      // https://www.bluetooth.org/en-us/specification/assigned-numbers/
      // service-discovery
      var serviceUuid = '0x1105';
      var req = adapter.getConnectedDevices(serviceUuid);
      req.onsuccess = () => {
        if (req.result) {
          this.debug('got connectedList');
          var connectedList = req.result;
          var length = connectedList.length;
          for (var i = 0; i < length; i++) {
            if (connectedList[i].address == address) {
              resolve(connectedList[i].name);
            }
          }
        } else {
          resolve(_('unknown-device'));
        }
      };
      req.onerror = () => {
        var msg = 'Can not check is device connected from adapter.';
        this.debug(msg);
        resolve(_('unknown-device'));
      };
    });
  },

  debug: function bt_debug(msg) {
    if (!this.onDebug) {
      return;
    }

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

  _onFilesSending: function bt__onFilesSending(evt) {
    // Notify user that we are sending files
    var icon = 'style/bluetooth_transfer/images/transfer.png';

    NotificationHelper.send('transfer-has-started-title', {
      'bodyL10n': 'transfer-has-started-description',
      'icon': icon
    }).then(function(notification) {
      notification.addEventListener('click',
        UtilityTray.show.bind(UtilityTray));
    });

    // Push sending files request in queue
    var sendingFilesSchedule = evt.detail;
    this._sendingFilesQueue.push(sendingFilesSchedule);
    var msg = 'push sending files request in queue, queued length = ' +
              this._sendingFilesQueue.length;
    this.debug(msg);
  },

  onReceivingFileConfirmation: function bt_onReceivingFileConfirmation(evt) {
    if (Service.query('NfcHandoverManager.isHandoverInProgress')) {
      // Bypassing confirm dialog while incoming file transfer via
      // NFC Handover
      this.debug('Incoming file via NFC Handover. Bypassing confirm dialog');
      window.dispatchEvent(new CustomEvent('nfc-transfer-started'));
      this.acceptReceive(evt);
      return;
    }

    // Prompt appears when a transfer request from a paired device is
    // received.
    this.debug('show receive confirm dialog');
    var address = evt.address;
    var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';

    this.getDeviceName(address).then((deviceName) => {
      var title = {
        id: 'transfer-confirmation-title',
        args: { deviceName: deviceName }
      };
      var body = 'transfer-confirmation-description';

      NotificationHelper.send(title, {
        'bodyL10n': body,
        'icon': icon
      }).then((notification) => {
        notification.addEventListener('click', () => {
          UtilityTray.hide();
          this.showReceivePrompt(evt);
        });
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

    this.getDeviceName(address).then(function(deviceName) {
      Service.request('showCustomDialog',
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
        confirm
      );
    });
  },

  declineReceive: function bt_declineReceive(address) {
    Service.request('hideCustomDialog');
    var adapter = Service.query('Bluetooth.getAdapter');
    if (adapter != null) {
      adapter.confirmReceivingFile(address, false);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  acceptReceive: function bt_acceptReceive(evt) {
    this.debug('accepted the file transfer');
    Service.request('hideCustomDialog');
    // Check storage is available or not before confirm receiving file
    var address = evt.address;
    var fileSize = evt.fileLength;
    this.checkStorageSpace(fileSize,
      (isStorageAvailable, errorMessage) => {
        var option = (isStorageAvailable) ? true : false;
        var adapter = Service.query('Bluetooth.getAdapter');
        if (adapter) {
          adapter.confirmReceivingFile(address, option);
        } else {
          var msg = 'Cannot get adapter from system Bluetooth monitor.';
          this.debug(msg);
        }
        // Storage is not available, then pop out a prompt with the reason
        if (!isStorageAvailable) {
          this.showStorageUnavaliablePrompt(errorMessage);
        }
    });
  },

  showStorageUnavaliablePrompt:
    function bt_showStorageUnavaliablePrompt(msg) {
      var confirm = {
        title: 'confirm',
        callback: function() {
          Service.request('hideCustomDialog');
        }
      };

      var body = msg;
      Service.request('showCustomDialog',
        'cannotReceiveFile', body, confirm, null);
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

  isSendFileQueueEmpty: function() {
    return this._sendingFilesQueue.length === 0;
  },

  isFileTransferInProgress: function() {
    var jobs = this.transferStatusList.querySelector('div');
    return jobs != null;
  },

  sendFileViaHandover: function bt_sendFileViaHandover(evt) {
    var mac = evt.detail.mac;
    var blob = evt.detail.blob;
    var adapter = Service.query('Bluetooth.getAdapter');
    if (adapter !== null) {
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
      setTimeout(() => {
        adapter.sendFile(mac, blob);
      }, waitConnectionReadyTimeoutTime);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  _onUpdateProgress: function bt__onUpdateProgress(mode, evt) {
    switch (mode) {
      case 'start':
        var transferInfo = evt.detail.transferInfo;
        this.initProgress(transferInfo);
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
        this.updateProgress(progress, evt);
        break;
    }
  },

  initProgress: function bt_initProgress(evt) {
    var _ = navigator.mozL10n.get;
    // Create progress dynamically in notification center
    var address = evt.address;
    var transferMode =
      (evt.received === true) ?
      _('bluetooth-receiving-progress') : _('bluetooth-sending-progress');

    // XXX: Bug 804533 - [Bluetooth]
    // Need sending/receiving icon for Bluetooth file transfer
    var content =
      `<div data-icon="bluetooth-transfer-circle" aria-hidden="true"></div>
      <div class="title-container">${transferMode}</div>
      <progress value="0" max="1"></progress>`;

    var transferTask = document.createElement('div');
    transferTask.id = 'bluetooth-transfer-status';
    transferTask.className = 'fake-notification';
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

  removeProgress: function bt_removeProgress(evt) {
    var address = evt.address;
    var id = 'div[data-id="' + address + '"]';
    var finishedTask = this.transferStatusList.querySelector(id);
    // If we decline receiving file, Bluetooth won't callback
    // 'bluetooth-opp-transfer-start', 'bluetooth-opp-update-progress' event.
    // So that there is no progress element which was created on notification.
    // There is only 'bluetooth-opp-transfer-complete' event to notify Gaia
    // the transferring request in failed case.
    if (finishedTask == null) {
      return;
    }

    finishedTask.removeEventListener('click',
                                     this.onCancelTransferTask.bind(this));
    this.transferStatusList.removeChild(finishedTask);
  },

  onCancelTransferTask: function bt_onCancelTransferTask(evt) {
    var id = evt.target.dataset.id;
    // Show confirm dialog for user to cancel transferring task
    UtilityTray.hide();
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

    Service.request('showCustomDialog',
      'cancelFileTransfer',
      'cancelFileTransfer',
      cancel,
      confirm
    );
  },

  continueTransfer: function bt_continueTransfer() {
    Service.request('hideCustomDialog');
  },

  cancelTransfer: function bt_cancelTransfer(address) {
    Service.request('hideCustomDialog');
    var adapter = Service.query('Bluetooth.getAdapter');
    if (adapter !== null) {
      adapter.stopSendingFile(address);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  _onTransferComplete: function bt__onTransferComplete(evt) {
    var transferInfo = evt.detail.transferInfo;
    // Remove transferring progress
    this.removeProgress(transferInfo);
    var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';

    // Show notification
    var nData = {
      titleL10n: null,
      icon: icon,
      onclick: null
    };

    if (transferInfo.success === true) {
      if (transferInfo.received) {
        // Received file can be opened only
        nData.titleL10n = 'transferFinished-receivedSuccessful-title';
        nData.onclick = this.openReceivedFile.bind(this, transferInfo);
      } else {
        nData.titleL10n = 'transferFinished-sentSuccessful-title';
      }
    } else {
      if (transferInfo.received) {
        nData.titleL10n = 'transferFinished-receivedFailed-title';
      } else {
        nData.titleL10n = 'transferFinished-sentFailed-title';
      }
    }

    var l10nArgs = {
      icon: nData.icon
    };

    if (transferInfo.fileName) {
      l10nArgs.body = transferInfo.fileName;
    } else {
      l10nArgs.bodyL10n = 'unknown-file';
    }

    var promise = NotificationHelper.send(nData.titleL10n, l10nArgs);

    if (nData.onclick) {
      promise.then(function(notification) {
        notification.addEventListener('click', nData.onclick);
      });
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

    window.dispatchEvent(new CustomEvent('nfc-transfer-completed', {
      detail: details}));
  },

  summarizeSentFilesReport:
    function bt_summarizeSentFilesReport(transferInfo) {
      // Ignore received files
      if (transferInfo.received) {
        return;
      }

      // Consumer: System app consume each sending file request from Bluetooth
      // app
      var msg = 'remove the finished sending task from queue, ' +
        'queue length = ';
      var successful = transferInfo.success;
      var sendingFilesSchedule = this._sendingFilesQueue[0];
      var numberOfFiles = sendingFilesSchedule.numberOfFiles;
      if (numberOfFiles == 1) { // for sent one file only.
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
          NotificationHelper.send('transferReport-title', {
            'bodyL10n': {
              id: 'transferReport-description',
              args: {
                numSuccessful: numSuccessful,
                numUnsuccessful: numUnsuccessful
              }
            },
            'icon': 'style/bluetooth_transfer/images/icon_bluetooth.png'
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
    var storage = navigator.getDeviceStorage(storageType);
    var getreq = storage.get(filePath);

    LazyLoader.load(['shared/js/mime_mapper.js']).then(() => {
      getreq.onerror = () => {
        var msg = 'failed to get file:' +
                  filePath + getreq.error.name +
                  getreq.error.name;
        this.debug(msg);
      };

      getreq.onsuccess = () => {
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

        a.onerror = (e) => {
          var msg = 'open activity error:' + a.error.name;
          this.debug(msg);
          switch (a.error.name) {
          case 'NO_PROVIDER':
            UtilityTray.hide();
            // Cannot identify MIMETYPE
            // So, show cannot open file dialog with unknow media type
            this.showUnknownMediaPrompt(fileName);
            return;
          case 'ActivityCanceled':
            return;
          case 'USER_ABORT':
            return;
          default:
            return;
          }
        };
        a.onsuccess = (e) => {
          var msg = 'open activity onsuccess';
          this.debug(msg);
        };
      };
    }).catch((err) => {
      console.error(err);
    });
  },

  showUnknownMediaPrompt: function bt_showUnknownMediaPrompt(fileName) {
    var confirm = {
      title: 'confirm',
      callback: function() {
        Service.request('hideCustomDialog');
      }
    };

    var body = {id: 'unknownMediaTypeToOpenFile', args: {fileName: fileName}};
    Service.request('showCustomDialog',
      'cannotOpenFile', body, confirm, null);
  }
};

exports.BluetoothTransfer = BluetoothTransfer;
})(window);
