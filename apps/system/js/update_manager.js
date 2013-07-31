'use strict';

/*
 * The UpdateManager is a central component for apps *and* system updates.
 * The user can start or cancel all downloads at once.
 * This component also makes sure of bothering the user to a minimum by
 * showing active notifications for new updates/errors only once.
 *
 * It maintains 2 queues of Updatable objects.
 * - updatesQueue for available updates
 * - downloadsQueue for active downloads
 */

var UpdateManager = {
  _mgmt: null,
  _downloading: false,
  _uncompressing: false,
  _downloadedBytes: 0,
  _errorTimeout: null,
  _wifiLock: null,
  _systemUpdateDisplayed: false,
  _dataConnectionWarningEnabled: true,
  _startedDownloadUsingDataConnection: false,
  _settings: null,
  NOTIFICATION_BUFFERING_TIMEOUT: 30 * 1000,
  TOASTER_TIMEOUT: 1200,

  container: null,
  message: null,
  toaster: null,
  toasterMessage: null,
  laterButton: null,
  notnowButton: null,
  downloadButton: null,
  downloadViaDataConnectionButton: null,
  downloadDialog: null,
  downloadViaDataConnectionDialog: null,
  downloadDialogTitle: null,
  downloadDialogList: null,
  lastUpdatesAvailable: 0,
  _notificationTimeout: null,

  updatableApps: [],
  systemUpdatable: null,
  updatesQueue: [],
  downloadsQueue: [],

  init: function um_init() {
    if (!this._mgmt) {
      this._mgmt = navigator.mozApps.mgmt;
    }

    this._mgmt.getAll().onsuccess = (function gotAll(evt) {
      var apps = evt.target.result;
      apps.forEach(function appIterator(app) {
        new AppUpdatable(app);
      });
    }).bind(this);

    this._settings = navigator.mozSettings;

    this.systemUpdatable = new SystemUpdatable();

    this.container = document.getElementById('update-manager-container');
    this.message = this.container.querySelector('.message');

    this.toaster = document.getElementById('update-manager-toaster');
    this.toasterMessage = this.toaster.querySelector('.message');

    this.laterButton = document.getElementById('updates-later-button');
    this.notnowButton =
      document.getElementById('updates-viaDataConnection-notnow-button');
    this.downloadButton = document.getElementById('updates-download-button');
    this.downloadViaDataConnectionButton =
      document.getElementById('updates-viaDataConnection-download-button');
    this.downloadDialog = document.getElementById('updates-download-dialog');
    this.downloadDialogTitle = this.downloadDialog.querySelector('h1');
    this.downloadDialogList = this.downloadDialog.querySelector('ul');
    this.downloadViaDataConnectionDialog =
      document.getElementById('updates-viaDataConnection-dialog');

    this.container.onclick = this.containerClicked.bind(this);
    this.laterButton.onclick = this.cancelPrompt.bind(this);
    this.downloadButton.onclick = this.requestDownloads.bind(this);
    this.downloadDialogList.onchange = this.updateDownloadButton.bind(this);
    this.notnowButton.onclick =
      this.cancelDataConnectionUpdatesPrompt.bind(this);
    this.downloadViaDataConnectionButton.onclick =
      this.requestDownloads.bind(this);

    window.addEventListener('mozChromeEvent', this);
    window.addEventListener('applicationinstall', this);
    window.addEventListener('applicationuninstall', this);
    window.addEventListener('online', this);
    window.addEventListener('offline', this);

    SettingsListener.observe('gaia.system.checkForUpdates', false,
                             this.checkForUpdates.bind(this));

    // We maintain the the edge and nowifi data attributes to show
    // a warning on the download dialog
    window.addEventListener('wifi-statuschange', this);
    this.updateWifiStatus();
    this.updateOnlineStatus();

    // Always display the warning after users reboot the phone.
    this._dataConnectionWarningEnabled = true;
    this.downloadDialog.dataset.dataConnectionInlineWarning = false;
  },

  requestDownloads: function um_requestDownloads(evt) {
    evt.preventDefault();

    if (evt.target == this.downloadViaDataConnectionButton) {
      this._startedDownloadUsingDataConnection = true;
      this.startDownloads();
    } else {
      if (this._dataConnectionWarningEnabled &&
          this.downloadDialog.dataset.nowifi === 'true') {
        this.downloadViaDataConnectionDialog.classList.add('visible');
      } else {
        this._startedDownloadUsingDataConnection = false;
        this.startDownloads();
      }
    }
  },

  startDownloads: function um_startDownloads() {
    this.downloadDialog.classList.remove('visible');
    this.downloadViaDataConnectionDialog.classList.remove('visible');

    UtilityTray.show();

    var checkValues = {};
    var dialog = this.downloadDialogList;
    var checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
      var checkbox = checkboxes[i];
      checkValues[checkbox.dataset.position] = checkbox.checked;
    }

    this.updatesQueue.forEach(function(updatable, index) {
      // The user opted out of the download
      if (updatable.app && !checkValues[index]) {
        return;
      }

      updatable.download();
    });

    this._downloadedBytes = 0;
    this.render();
  },

  cancelAllDownloads: function um_cancelAllDownloads() {
    CustomDialog.hide();

    // We're emptying the array while iterating
    while (this.downloadsQueue.length) {
      var updatable = this.downloadsQueue[0];
      updatable.cancelDownload();
      this.removeFromDownloadsQueue(updatable);
    }
  },

  requestErrorBanner: function um_requestErrorBanner() {
    if (this._errorTimeout)
      return;

    var _ = navigator.mozL10n.get;
    var self = this;
    this._errorTimeout = setTimeout(function waitForMore() {
      SystemBanner.show(_('downloadError'));
      self._errorTimeout = null;
    }, this.NOTIFICATION_BUFFERING_TIMEOUT);
  },

  containerClicked: function um_containerClicker() {
    var _ = navigator.mozL10n.get;

    if (this._downloading) {
      var cancel = {
        title: _('no'),
        callback: this.cancelPrompt.bind(this)
      };

      var confirm = {
        title: _('yes'),
        callback: this.cancelAllDownloads.bind(this)
      };

      CustomDialog.show(_('cancelAllDownloads'), _('wantToCancelAll'),
                        cancel, confirm);
    } else {
      this.showDownloadPrompt();
    }

    UtilityTray.hide();
  },

  showDownloadPrompt: function um_showDownloadPrompt() {
    var _localize = navigator.mozL10n.localize;

    this._systemUpdateDisplayed = false;
    _localize(this.downloadDialogTitle, 'numberOfUpdates', {
      n: this.updatesQueue.length
    });

    var updateList = '';

    // System update should always be on top
    this.updatesQueue.sort(function sortUpdates(updatable, otherUpdatable) {
      if (!updatable.app)
        return -1;
      if (!otherUpdatable.app)
        return 1;

      if (updatable.name < otherUpdatable.name)
        return -1;
      if (updatable.name > otherUpdatable.name)
        return 1;
      return 0;
    });

    this.downloadDialogList.innerHTML = '';
    this.updatesQueue.forEach(function updatableIterator(updatable, index) {
      var listItem = document.createElement('li');

      // The user can choose not to update an app
      var checkContainer = document.createElement('label');
      if (updatable instanceof SystemUpdatable) {
        _localize(checkContainer, 'required');
        checkContainer.classList.add('required');
        this._systemUpdateDisplayed = true;
      } else {
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.position = index;
        checkbox.checked = true;

        var span = document.createElement('span');

        checkContainer.classList.add('pack-checkbox');
        checkContainer.appendChild(checkbox);
        checkContainer.appendChild(span);
      }
      listItem.appendChild(checkContainer);

      var name = document.createElement('div');
      name.classList.add('name');
      name.textContent = updatable.name;
      if (updatable.nameL10nId) {
        name.dataset.l10nId = updatable.nameL10nId;
      }
      listItem.appendChild(name);

      if (updatable.size) {
        var sizeItem = document.createElement('div');
        sizeItem.textContent = this._humanizeSize(updatable.size);
        listItem.appendChild(sizeItem);
      } else {
        listItem.classList.add('nosize');
      }

      this.downloadDialogList.appendChild(listItem);
    }, this);

    this.downloadDialog.classList.add('visible');
    this.updateDownloadButton();
  },

  updateDownloadButton: function() {
    if (this._systemUpdateDisplayed) {
      this.downloadButton.disabled = false;
      return;
    }

    var disabled = true;

    var dialog = this.downloadDialogList;
    var checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        disabled = false;
        break;
      }
    }

    this.downloadButton.disabled = disabled;
  },

  cancelPrompt: function um_cancelPrompt() {
    CustomDialog.hide();
    this.downloadDialog.classList.remove('visible');
  },

  cancelDataConnectionUpdatesPrompt: function um_cancelDCUpdatesPrompt() {
    CustomDialog.hide();
    this.downloadViaDataConnectionDialog.classList.remove('visible');
    this.downloadDialog.classList.remove('visible');
  },

  downloadProgressed: function um_downloadProgress(bytes) {
    if (bytes > 0) {
      this._downloadedBytes += bytes;
      this.render();
    }
  },

  downloaded: function um_downloaded(udatable) {
    if (this._startedDownloadUsingDataConnection) {
      this._startedDownloadUsingDataConnection = false;
      this._dataConnectionWarningEnabled = false;
      this.downloadDialog.dataset.dataConnectionInlineWarning = true;
    }
  },

  startedUncompressing: function um_startedUncompressing() {
    this._uncompressing = true;
    this.render();
  },

  render: function um_render() {
    var _localize = navigator.mozL10n.localize;

    _localize(this.toasterMessage, 'updateAvailableInfo', {
      n: this.updatesQueue.length - this.lastUpdatesAvailable
    });

    if (this._downloading) {
      if (this._uncompressing && this.downloadsQueue.length === 1) {
        _localize(this.message, 'uncompressingMessage');
      } else {
        _localize(this.message, 'downloadingUpdateMessage', {
          progress: this._humanizeSize(this._downloadedBytes)
        });
      }
    } else {
      _localize(this.message, 'updateAvailableInfo', {
        n: this.updatesQueue.length
      });
    }

    var css = this.container.classList;
    this._downloading ? css.add('downloading') : css.remove('downloading');
  },

  addToUpdatableApps: function um_addtoUpdatableapps(updatableApp) {
    this.updatableApps.push(updatableApp);
  },

  removeFromAll: function um_removeFromAll(updatableApp) {
    var removeIndex = this.updatableApps.indexOf(updatableApp);
    if (removeIndex === -1)
      return;

    var removedApp = this.updatableApps[removeIndex];
    this.removeFromUpdatesQueue(removedApp);

    removedApp.uninit();
    this.updatableApps.splice(removeIndex, 1);
  },

  addToUpdatesQueue: function um_addToUpdatesQueue(updatable) {
    if (this._downloading) {
      return;
    }

    if (updatable.app &&
        updatable.app.installState !== 'installed') {
      return;
    }

    if (updatable.app &&
        this.updatableApps.indexOf(updatable) === -1) {
      return;
    }

    var alreadyThere = this.updatesQueue.some(function lookup(u) {
      return (u.app === updatable.app);
    });
    if (alreadyThere) {
      return;
    }

    this.updatesQueue.push(updatable);

    if (this._notificationTimeout === null) {
      this._notificationTimeout = setTimeout(
        this.displayNotificationAndToaster.bind(this),
        this.NOTIFICATION_BUFFERING_TIMEOUT);
    }
    this.render();
  },

  displayNotificationAndToaster: function um_displayNotificationAndToaster() {
    this._notificationTimeout = null;
    if (this.updatesQueue.length && !this._downloading) {
      this.lastUpdatesAvailable = this.updatesQueue.length;
      StatusBar.updateNotificationUnread(true);
      this.displayNotificationIfHidden();
      this.toaster.classList.add('displayed');
      var self = this;
      setTimeout(function waitToHide() {
        self.toaster.classList.remove('displayed');
      }, this.TOASTER_TIMEOUT);
    }
  },

  removeFromUpdatesQueue: function um_removeFromUpdatesQueue(updatable) {
    var removeIndex = this.updatesQueue.indexOf(updatable);
    if (removeIndex === -1)
      return;

    this.updatesQueue.splice(removeIndex, 1);
    this.lastUpdatesAvailable = this.updatesQueue.length;

    if (this.updatesQueue.length === 0) {
      this.hideNotificationIfDisplayed();
    }

    this.render();
  },

  addToDownloadsQueue: function um_addToDownloadsQueue(updatable) {
    if (updatable.app &&
        this.updatableApps.indexOf(updatable) === -1) {
      return;
    }

    var alreadyThere = this.downloadsQueue.some(function lookup(u) {
      return (u.app === updatable.app);
    });
    if (alreadyThere) {
      return;
    }

    this.downloadsQueue.push(updatable);

    if (this.downloadsQueue.length === 1) {
      this._downloading = true;
      StatusBar.incSystemDownloads();
      this._wifiLock = navigator.requestWakeLock('wifi');

      this.displayNotificationIfHidden();
      this.render();
    }
  },

  removeFromDownloadsQueue: function um_removeFromDownloadsQueue(updatable) {
    var removeIndex = this.downloadsQueue.indexOf(updatable);
    if (removeIndex === -1)
      return;

    this.downloadsQueue.splice(removeIndex, 1);

    if (this.downloadsQueue.length === 0) {
      this._downloading = false;
      StatusBar.decSystemDownloads();
      this._downloadedBytes = 0;
      this.checkStatuses();

      if (this._wifiLock) {
        try {
          this._wifiLock.unlock();
        } catch (e) {
          // this can happen if the lock is already unlocked
          console.error('error during unlock', e);
        }

        this._wifiLock = null;
      }

      this.render();
    }
  },

  hideNotificationIfDisplayed: function() {
    if (this.container.classList.contains('displayed')) {
      this.container.classList.remove('displayed');
      NotificationScreen.decExternalNotifications();
    }
  },

  displayNotificationIfHidden: function() {
    if (!this.container.classList.contains('displayed')) {
      this.container.classList.add('displayed');
      NotificationScreen.incExternalNotifications();
    }
  },

  checkStatuses: function um_checkStatuses() {
    this.updatableApps.forEach(function(updatableApp) {
      var app = updatableApp.app;
      if (app.downloadAvailable) {
        this.addToUpdatesQueue(updatableApp);
      }
    }, this);
  },

  oninstall: function um_oninstall(evt) {
    var app = evt.application;
    var updatableApp = new AppUpdatable(app);
  },

  onuninstall: function um_onuninstall(evt) {
    this.updatableApps.some(function appIterator(updatableApp, index) {
      // The application object we get from the event
      // has only origin and manifestURL properties
      if (updatableApp.app.manifestURL === evt.application.manifestURL) {
        this.removeFromAll(updatableApp);
        return true;
      }
      return false;
    }, this);
  },

  handleEvent: function um_handleEvent(evt) {
    if (!evt.type)
      return;

    switch (evt.type) {
      case 'applicationinstall':
        this.oninstall(evt.detail);
        break;
      case 'applicationuninstall':
        this.onuninstall(evt.detail);
        break;
      case 'offline':
        this.updateOnlineStatus();
        break;
      case 'online':
        this.updateOnlineStatus();
        break;
      case 'wifi-statuschange':
        this.updateWifiStatus();
        break;
    }

    if (evt.type !== 'mozChromeEvent')
      return;

    var detail = evt.detail;

    if (detail.type && detail.type === 'update-available') {
      this.systemUpdatable.size = detail.size;
      this.systemUpdatable.rememberKnownUpdate();
      this.addToUpdatesQueue(this.systemUpdatable);
    }
  },

  updateOnlineStatus: function su_updateOnlineStatus() {
    var online = (navigator && 'onLine' in navigator) ? navigator.onLine : true;
    this.downloadDialog.dataset.online = online;

    if (online) {
      this.laterButton.classList.remove('full');
    } else {
      this.laterButton.classList.add('full');
    }
  },

  updateWifiStatus: function su_updateWifiStatus() {
    var wifiManager = window.navigator.mozWifiManager;
    if (!wifiManager)
      return;

    this.downloadDialog.dataset.nowifi =
      (wifiManager.connection.status != 'connected');
  },

  checkForUpdates: function su_checkForUpdates(shouldCheck) {
    if (!shouldCheck) {
      return;
    }

    this._dispatchEvent('force-update-check');

    if (!this._settings) {
      return;
    }

    var lock = this._settings.createLock();
    lock.set({
      'gaia.system.checkForUpdates': false
    });
  },

  _dispatchEvent: function um_dispatchEvent(type, result) {
    var event = document.createEvent('CustomEvent');
    var data = { type: type };
    if (result) {
      data.result = result;
    }

    event.initCustomEvent('mozContentEvent', true, true, data);
    window.dispatchEvent(event);
  },

  // This is going to be part of l10n.js
  _humanizeSize: function um_humanizeSize(bytes) {
    var _ = navigator.mozL10n.get;
    var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];

    if (!bytes)
      return '0.00 ' + _(units[0]);

    var e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(e))).toFixed(2) + ' ' +
      _(units[e]);
  }
};

window.addEventListener('localized', function startup(evt) {
  window.removeEventListener('localized', startup);

  UpdateManager.init();
});
