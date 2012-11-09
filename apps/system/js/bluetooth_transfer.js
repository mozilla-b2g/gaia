/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var BluetoothTransfer = {
  bannerContainer: null,
  pairList: {
    index: []
  },
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
    var self = this;
    navigator.mozSetMessageHandler('bluetooth-opp-receiving-file-confirmation',
      function bt_gotReceivingFileConfirmationMessage(message) {
        self.onReceivingFileConfirmation(message);
      }
    );
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-start',
      function bt_gotTransferStartMessage(message) {
        self.onUpdateProgress('start', message);
      }
    );
    navigator.mozSetMessageHandler('bluetooth-opp-update-progress',
      function bt_gotUpdateProgressMessage(message) {
        self.onUpdateProgress('progress', message);
      }
    );
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-complete',
      function bt_gotTransferCompleteMessage(message) {
        self.onTransferComplete(message);
      }
    );
    this.bannerContainer = this.banner.firstElementChild;
  },

  getDeviceName: function bt_getDeviceName(address) {
    var length = this.pairList.index.length;
    for (var i = 0; i < length; i++) {
      if (this.pairList.index[i].address == address)
        return this.pairList.index[i].name;
    }
    return _('unknow-device');
  },

  getPairedDevice: function bt_getPairedDevice(callback) {
    var adapter = Bluetooth.getAdapter();
    if (adapter == null) {
      var msg = 'Cannot get Bluetooth adapter.';
      this.cannotGetBluetoothInfo(msg);
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
        self.cannotGetBluetoothInfo(msg);
        return;
      }
      if (callback) {
        callback();
      }
    };
    req.onerror = function() {
      var msg = 'Can not get paired devices from adapter.';
      self.cannotGetBluetoothInfo(msg);
    };
  },

  debug: function bt_debug(msg) {
    if (!this._debug)
      return;

    console.log('[System Bluetooth Transfer]: ' + msg);
  },

  cannotGetBluetoothInfo: function bt_cannotGetBluetoothInfo(msg) {
    this.debug(msg);
  },

  onReceivingFileConfirmation: function bt_onReceivingFileConfirmation(evt) {
    // Prompt appears when a transfer request from a paired device is received.
    UtilityTray.hide();
    this.showReceivePrompt(evt);
  },

  showReceivePrompt: function bt_showReceivePrompt(evt) {
    var _ = navigator.mozL10n.get;

    var address = evt.address;
    var fileName = evt.fileName;
    var fileSize = evt.fileLength;
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
                        _('wantToReceive',
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
      this.cannotGetBluetoothInfo(msg);
    }
  },

  acceptReceive: function bt_acceptReceive(address) {
    CustomDialog.hide();
    var adapter = Bluetooth.getAdapter();
    if (adapter != null) {
      adapter.confirmReceivingFile(address, true);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.cannotGetBluetoothInfo(msg);
    }
  },

  onUpdateProgress: function bt_onUpdateProgress(mode, evt) {
    switch (mode) {
      case 'start':
        this.initProgress(evt);
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
    // Create progress dynamically in notification center
    var _ = navigator.mozL10n.get;
    var address = evt.address;
    var transferMode =
      (evt.received == true) ?
      _('bluetooth-receiving-progress') : _('bluetooth-sending-progress');
    var content =
      '<div class="bluetooth-transfer-progress">' + transferMode + '</div>' +
      '<div class="icon"></div>' +
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
      this.cannotGetBluetoothInfo(msg);
    }
  },

  onTransferComplete: function bt_onTransferComplete(evt) {
    var _ = navigator.mozL10n.get;
    // Remove transferring progress
    this.removeProgress(evt);
    // Show banner and notification
    if (evt.success == true) {
       // Show completed message of transferred result on the banner
      this.showBanner(true);
      if (evt.received) {
        // Received file can be opened only
        // TODO: Need to modify the icon after visual provide
        NotificationHelper.send(_('transferFinished-receivedCompletedTitle'),
                                _('transferFinished-completedBody'),
                                'style/system_updater/images/download.png',
                                this.openReceivedFile.bind(this, evt.fileName));
      } else {
        NotificationHelper.send(_('transferFinished-sendingCompletedTitle'),
                                _('transferFinished-completedBody'),
                                'style/system_updater/images/download.png');
      }
    } else {
      // Show failed message of transferred result on the banner
      this.showBanner(false);
      if (evt.received) {
        NotificationHelper.send(_('transferFinished-sendingFailedTitle'),
                                _('transferFinished-failedBody'),
                                'style/system_updater/images/download.png');
      } else {
        NotificationHelper.send(_('transferFinished-receivedFailedTitle'),
                                _('transferFinished-failedBody'),
                                'style/system_updater/images/download.png');
      }
    }
  },

  openReceivedFile: function bt_openReceivedFile(fileName) {
    // TODO: Open received file
  }

};

BluetoothTransfer.init();
