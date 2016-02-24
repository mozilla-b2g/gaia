/* global AppUpdatable, LazyLoader, MozActivity, NotificationScreen, Service,
          SettingsListener, SystemBanner, mozIntl, SystemUpdatable */

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


(function(exports) {
  var UpdateManager = {
    _mgmt: null,
    _downloading: false,
    _uncompressing: false,
    _downloadedBytes: 0,
    _errorTimeout: null,
    _wifiLock: null,
    _systemUpdateDisplayed: false,
    _startedDownloadUsingDataConnection: false,
    _settings: null,
    _hasDialog: false,
    UPDATE_NOTIF_ID: 'update-notification',
    NOTIFICATION_BUFFERING_TIMEOUT: 30 * 1000,
    TOASTER_TIMEOUT: 1200,
    UPDATE_2G_SETT: 'update.2g.enabled',
    UPDATE_2G: false,
    ROAMING_SETTING_KEY: 'ril.data.roaming_enabled',
    DATA_TYPES_NO_ALLOWED: ['edge', 'gprs', '1xrtt', 'is95a', 'is95b'],
    WIFI_PRIORITIZED: true,
    WIFI_PRIORITIZED_KEY: 'app.update.wifi-prioritized',
    connection2G: false,

    container: null,
    message: null,
    toaster: null,
    toasterMessage: null,
    laterButton: null,
    notnowButton: null,
    downloadButton: null,
    downloadViaDataConnectionButton: null,
    downloadDialog: null,
    downloadViaDataConnectionTitle: null,
    downloadViaDataConnectionDialog: null,
    downloadViaDataConnectionMessage: null,
    downloadDialogTitle: null,
    downloadDialogList: null,
    lastUpdatesAvailable: 0,
    _notificationTimeout: null,

    updatableApps: [],
    systemUpdatable: null,
    updatesQueue: [],
    downloadsQueue: [],

    start: function() {
      if (!this._mgmt) {
        this._mgmt = navigator.mozApps.mgmt;
      }

      this._mgmt.getAll().onsuccess = (function gotAll(evt) {
        var apps = evt.target.result;
        apps.forEach(function appIterator(app) {
          /* jshint nonew: false */
          new AppUpdatable(app);
        });
      }).bind(this);

      this._settings = navigator.mozSettings;

      this.systemUpdatable = new SystemUpdatable();

      this.container = document.getElementById('update-manager-container');
      this.message = this.container.querySelector('.title-container');

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
      this.downloadViaDataConnectionMessage =
        this.downloadViaDataConnectionDialog.querySelector('p');
      this.downloadViaDataConnectionTitle =
        this.downloadViaDataConnectionDialog.querySelector('h1');

      this.container.onclick = this.containerClicked.bind(this);
      this.laterButton.onclick = this.cancelPrompt.bind(this);
      this.toaster.onclick = this.toasterClicked.bind(this);
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
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('home', this);
      window.addEventListener('holdhome', this);

      SettingsListener.observe('gaia.system.checkForUpdates', false,
                               this.checkForUpdates.bind(this));

      // We maintain the the edge and nowifi data attributes to show
      // a warning on the download dialog
      window.addEventListener('wifi-statuschange', this);
      this.updateWifiStatus();
      this.updateOnlineStatus();
    },

    requestDownloads: function um_requestDownloads(evt) {
      evt.preventDefault();
      if (evt.target == this.downloadViaDataConnectionButton) {
        this._startedDownloadUsingDataConnection = true;
        this.startDownloads();
      } else {
        this.promptOrDownload();
      }
    },

    startDownloads: function um_startDownloads() {
      this.downloadViaDataConnectionDialog.classList.remove('visible');
      this._closeDownloadDialog();
      Service.request('UtilityTray:show');

      var checkValues = {};
      var dialog = this.downloadDialogList;
      var checkboxes = dialog.querySelectorAll('gaia-checkbox');
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
      Service.request('hideCustomDialog');
      this._hasDialog = false;

      // We're emptying the array while iterating
      while (this.downloadsQueue.length) {
        var updatable = this.downloadsQueue[0];
        updatable.cancelDownload();
        this.removeFromDownloadsQueue(updatable);
      }
    },

    requestErrorBanner: function um_requestErrorBanner() {
      if (this._errorTimeout) {/* jshint nonew: false */

        return;
      }

      var self = this;
      this._errorTimeout = setTimeout(function waitForMore() {
        LazyLoader.load(['js/system_banner.js']).then(function() {
          var systemBanner = new SystemBanner();
          systemBanner.show('downloadError');
          self._errorTimeout = null;
        })['catch'](function(err) {
          console.error(err);
        });
      }, this.NOTIFICATION_BUFFERING_TIMEOUT);
    },

    promptOrDownload: function um_promptOrDownload() {
      var self = this;

      if (self.downloadDialog.dataset.online == 'false') {
        self.showPromptNoConnection();
        return;
      }

      if (self._wifiAvailable()) {
        self._startedDownloadUsingDataConnection = false;
        self.startDownloads();
        return;
      }

      var wifiPrioritized = self.getWifiPrioritized();
      var update2GEnabled = self.getUpdate2GEnabled();

      // We can download the update only if the current connection
      // is not forbidden for download
      var conns = window.navigator.mozMobileConnections;
      if (!conns) {
        // B2G desktop/Mulet
        if (navigator.onLine) {
          self.startDownloads();
          return;
        }
        console.error('mozMobileConnections is not available we can ' +
                      'not update the phone.');
        self.showPromptNoConnection();
        return;
      }

      var dataType;
      // In DualSim only one of them will have data active
      for (var i = 0; i < conns.length && !dataType; i++) {
        dataType = conns[i].data.type;
      }
      if (!dataType) {
        console.error('There are not wifi connection nor data ' +
                      'connection. We can not download update');
        self.showForbiddenDownload();
        return;
      }

      if (self.DATA_TYPES_NO_ALLOWED.indexOf(dataType) >= 0) {
        self.connection2G = true;
      } else {
        self.connection2G = false;
      }

      // If it's not connected to a wifi we need to verify what kind of
      // connection it has
      Promise.all([wifiPrioritized, update2GEnabled]).then(function(values) {
        var prioritized = values[0];
        var update2G = values[1];
        // If update 2G is available we don't need to know what kind
        // of connection the phone has
        if (update2G) {
          if (prioritized) {
            self.showPromptWifiPrioritized();
          } else {
            self.showPrompt3GAdditionalCostIfNeeded();
          }
          return;
        }

        //2G connection
        if (self.connection2G && self._systemUpdateDisplayed) {
          self.showForbiddenDownload();
          return;
        }

        //3G connection
        if (prioritized) {
          self.showPromptWifiPrioritized();
        } else {
          self.showPrompt3GAdditionalCostIfNeeded();
        }
      });
    },

    containerClicked: function um_containerClicker() {
      if (this._downloading) {
        if (this._uncompressing) {
          // If notification was clicked during uncompression, do nothing.
          return;
        }
        var cancel = {
          title: 'no',
          callback: this.cancelPrompt.bind(this)
        };

        var confirm = {
          title: 'yes',
          callback: this.cancelAllDownloads.bind(this)
        };

        Service.request('showCustomDialog',
          'cancelAllDownloads',
          'wantToCancelAll',
          cancel,
          confirm
        );
        this._hasDialog = true;
      } else {
        this.showDownloadPrompt();
      }

      Service.request('UtilityTray:hide');
    },

    toasterClicked: function um_toasterClicked() {
      if (this._downloading) {
        return;
      }

      this.showDownloadPrompt();
      Service.request('UtilityTray:hide');
    },

    showForbiddenDownload: function um_showForbiddenDownload() {
      //Close any dialog if there is any open
      Service.request('hideCustomDialog');
      var ok = {
        title: 'ok',
        callback: this.cancelPrompt.bind(this)
      };

      window.dispatchEvent(new CustomEvent('updatepromptshown'));

      Service.request('showCustomDialog',
        'systemUpdate', 'downloadUpdatesVia2GForbidden3', ok, null);
      this._hasDialog = true;
    },

    showPromptNoConnection: function um_showPromptNoConnection() {
      //Close any dialog if there is any open
      Service.request('hideCustomDialog');
      var ok = {
        title: 'ok',
        callback: this.cancelPrompt.bind(this)
      };

      window.dispatchEvent(new CustomEvent('updatepromptshown'));

      Service.request('showCustomDialog',
        'systemUpdate', 'downloadOfflineWarning2', ok, null);
      this._hasDialog = true;
    },

    showDownloadPrompt: function um_showDownloadPrompt() {
      var _localize = navigator.mozL10n.setAttributes;

      this._systemUpdateDisplayed = false;
      _localize(this.downloadDialogTitle, 'numberOfUpdates', {
        n: this.updatesQueue.length
      });

      // System update should always be on top
      this.updatesQueue.sort(function sortUpdates(updatable, otherUpdatable) {
        if (!updatable.app) {
          return -1;
        }
        if (!otherUpdatable.app) {
          return 1;
        }

        if (updatable.name < otherUpdatable.name) {
          return -1;
        }
        if (updatable.name > otherUpdatable.name) {
          return 1;
        }
        return 0;
      });

      this.downloadDialogList.innerHTML = '';
      this.updatesQueue.forEach(function updatableIterator(updatable, index) {
        var listItem = document.createElement('li');
        var nameDetails;

        // The user can choose not to update an app
        if (updatable instanceof SystemUpdatable) {
          var checkContainer = document.createElement('label');
          _localize(checkContainer, 'required');
          checkContainer.classList.add('required');
          this._systemUpdateDisplayed = true;
          listItem.appendChild(checkContainer);
          nameDetails = listItem;
        } else {
          var checkbox = document.createElement('gaia-checkbox');
          checkbox.dataset.position = index;
          checkbox.checked = true;

          var label = document.createElement('label');
          nameDetails = label;

          checkbox.appendChild(label);
          listItem.appendChild(checkbox);
        }

        var name = document.createElement('span');
        name.classList.add('name');
        if (updatable.nameL10nId) {
          _localize(name, updatable.nameL10nId, updatable.nameL10nArgs);
        } else {
          name.textContent = updatable.name;
        }
        nameDetails.appendChild(name);

        if (updatable.size) {
          var sizeItem = document.createElement('span');
          this._humanizeSize(updatable.size).then(val => {
            sizeItem.textContent = val;
          });
          nameDetails.appendChild(sizeItem);
        } else {
          nameDetails.classList.add('nosize');
        }

        if (updatable.buildID) {
          var buildId = document.createElement('span');
          buildId.classList.add('font-light');
          _localize(buildId, 'build-id', { buildid: updatable.buildID });
          listItem.appendChild(buildId);
        }

        if (updatable.detailsURL && (updatable.detailsURL !== 'about:blank')) {
          var detailsUrl = document.createElement('a');
          _localize(detailsUrl, 'view-release-notes');
          listItem.appendChild(detailsUrl);
          listItem.onclick = (function(event) {
            event.preventDefault();

            var activity = new MozActivity({
              name: 'view',
              data: {
                type: 'url',
                url: updatable.detailsURL
              }
            });

            activity.onsuccess = this.cancelPrompt.bind(this);
          }).bind(this);
        }

        this.downloadDialogList.appendChild(listItem);
      }, this);

      window.dispatchEvent(new CustomEvent('updatepromptshown'));
      this._hasDialog = true;
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
      var checkboxes = dialog.querySelectorAll('gaia-checkbox');
      for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
          disabled = false;
          break;
        }
      }
      this.downloadButton.disabled = disabled;
    },

    cancelPrompt: function um_cancelPrompt() {
      Service.request('hideCustomDialog');
      this._hasDialog = false;
      this._closeDownloadDialog();
    },

    cancelDataConnectionUpdatesPrompt: function um_cancelDCUpdatesPrompt() {
      Service.request('hideCustomDialog');
      this._hasDialog = false;
      this.downloadViaDataConnectionDialog.classList.remove('visible');
      this._closeDownloadDialog();
    },

    getWifiPrioritized: function um_getWifiPrioritized() {
      var wifiPrioritized = this.WIFI_PRIORITIZED;
      var settings = window.navigator.mozSettings;
      var self = this;
      var getRequest = settings.createLock().get(this.WIFI_PRIORITIZED_KEY);

      return new Promise(function(resolve, reject) {
        getRequest.onerror = function() {
          resolve(wifiPrioritized);
        };
        getRequest.onsuccess = function() {
          var prioritized = getRequest.result[self.WIFI_PRIORITIZED_KEY];
          if (typeof prioritized !== 'boolean') {
            prioritized = wifiPrioritized;
          }
          resolve(prioritized);
        };
      });
    },

    getUpdate2GEnabled: function um_getUpdate2GEnabled() {
      var update2G = this.UPDATE_2G;
      var settings = window.navigator.mozSettings;
      var self = this;
      var getRequest = settings.createLock().get(this.UPDATE_2G_SETT);

      return new Promise(function(resolve, reject) {
        getRequest.onerror = function() {
          resolve(update2G);
        };
        getRequest.onsuccess = function() {
          var setting = getRequest.result[self.UPDATE_2G_SETT];
          if (typeof setting !== 'boolean') {
            setting = update2G;
          }
          resolve(setting);
        };
      });
    },

    showPrompt3GAdditionalCostIfNeeded:
      function um_showPrompt3GAdditionalCostIfNeeded() {
      this._openDownloadViaDataDialog();
      Service.request('hideCustomDialog');
      this._hasDialog = false;
    },

    showPromptWifiPrioritized:
      function um_showPromptWifiPrioritized(downloadCallback) {
      if (!downloadCallback) {
        downloadCallback = this.showPrompt3GAdditionalCostIfNeeded;
      }
      var notNow = {
        title: 'notNow',
        callback: this.cancelPrompt.bind(this)
      };

      var download = {
        title: 'download',
        recommend: true,
        callback: downloadCallback.bind(this)
      };

      var messageL10n = this.connection2G ? 'downloadWifiPrioritizedUsing2G' :
        'downloadWifiPrioritized3';

      this._closeDownloadDialog();

      window.dispatchEvent(new CustomEvent('updatepromptshown'));

      Service.request('UtilityTray:hide');
      Service.request('showCustomDialog',
        'systemUpdate',
        messageL10n,
        notNow,
        download
      );
      this._hasDialog = true;
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
      }
    },

    startedUncompressing: function um_startedUncompressing() {
      this._uncompressing = true;
      this.render();
    },

    render: function um_render() {
      var _localize = navigator.mozL10n.setAttributes;
      var l10nId = 'updateAvailableInfo';

      if ((this.updatesQueue.length === 1) &&
          (this.updatesQueue[0] instanceof SystemUpdatable)) {
        l10nId = 'systemUpdateAvailableInfo';
      }

      _localize(this.toasterMessage, l10nId, {
        n: this.updatesQueue.length - this.lastUpdatesAvailable
      });

      if (this._downloading) {
        if (this._uncompressing && this.downloadsQueue.length === 1) {
          _localize(this.message, 'uncompressingMessage');
        } else {
          this._humanizeSize(this._downloadedBytes).then(progress => {
            _localize(this.message, 'downloadingUpdateMessage', { progress });
          });
        }
      } else {
        _localize(this.message, l10nId, { n: this.updatesQueue.length });
      }

      var css = this.container.classList;
      this._downloading ? css.add('downloading') : css.remove('downloading');
    },

    addToUpdatableApps: function um_addtoUpdatableapps(updatableApp) {
      this.updatableApps.push(updatableApp);
    },

    removeFromAll: function um_removeFromAll(updatableApp) {
      var removeIndex = this.updatableApps.indexOf(updatableApp);
      if (removeIndex === -1) {
        return;
      }

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
      if (removeIndex === -1) {
        return;
      }

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
        Service.request('incDownloads');
        this._wifiLock = navigator.requestWakeLock('wifi');

        this.displayNotificationIfHidden();
        this.render();
      }
    },

    removeFromDownloadsQueue: function um_removeFromDownloadsQueue(updatable) {
      var removeIndex = this.downloadsQueue.indexOf(updatable);
      if (removeIndex === -1) {
        return;
      }

      this.downloadsQueue.splice(removeIndex, 1);

      if (this.downloadsQueue.length === 0) {
        this._downloading = false;
        this._uncompressing = false;
        Service.request('decDownloads');
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
        NotificationScreen.removeUnreadNotification(this.UPDATE_NOTIF_ID);
      }
    },

    displayNotificationIfHidden: function() {
      if (!this.container.classList.contains('displayed')) {
        this.container.classList.add('displayed');
        NotificationScreen.addUnreadNotification(this.UPDATE_NOTIF_ID);
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
      /* jshint nonew: false */
      new AppUpdatable(app);
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
      if (!evt.type) {
        return;
      }

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
        case 'lockscreen-appopened':
          if (this.systemUpdatable.showingApplyPrompt) {
            this.systemUpdatable.declineInstallWait();
          }
          this.downloadViaDataConnectionDialog.classList.remove('visible');
          this._closeDownloadDialog();
          // only request while update manager shows a dialog
          if (this._hasDialog) {
            Service.request('hideCustomDialog');
          }
          break;
        case 'home':
        case 'holdhome':
          if (this._hasDialog) {
            this.cancelPrompt();
          }
          break;
      }

      if (evt.type !== 'mozChromeEvent') {
        return;
      }

      var detail = evt.detail;

      if (detail.type && detail.type === 'update-available') {
        this.systemUpdatable.size = detail.size;
        this.systemUpdatable.buildID = detail.buildID;
        this.systemUpdatable.detailsURL = detail.detailsURL;
        this.systemUpdatable.nameL10nArgs = { version: detail.displayVersion };
        this.systemUpdatable.rememberKnownUpdate();
        this.addToUpdatesQueue(this.systemUpdatable);
      }
    },

    updateOnlineStatus: function su_updateOnlineStatus() {
      var online = (navigator && 'onLine' in navigator) ?
                    navigator.onLine : true;
      this.downloadDialog.dataset.online = online;
    },

    _wifiAvailable: function su_wifiAvailable() {
      var wifiManager = window.navigator.mozWifiManager;
      if (!wifiManager) {
        return;
      }
      return wifiManager.connection.status == 'connected';
    },

    updateWifiStatus: function su_updateWifiStatus() {
      this.downloadDialog.dataset.nowifi = !this._wifiAvailable();
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

    _openDownloadViaDataDialog: function um_downloadViaDataDialog() {
      var _ = navigator.mozL10n.setAttributes;
      var connections = window.navigator.mozMobileConnections;
      var dataType;
      var sim;

      if (!connections) {
        this.showForbiddenDownload();
        return;
      }
      // In DualSim only one of them will have data active
      for (var i = 0; i < connections.length && !dataType; i++) {
        dataType = connections[i].data.type;
        sim = connections[i];
      }

      if (!dataType) {
        //No connection available
        self.showForbiddenDownload();
        return;
      }
      var dataRoamingSettingPromise = this._getDataRoamingSetting();
      dataRoamingSettingPromise.then(function(roaming) {
        if (roaming && sim.data.roaming) {
          _(this.downloadViaDataConnectionTitle,
            'downloadUpdatesViaDataRoamingConnection');
          _(this.downloadViaDataConnectionMessage,
            'downloadUpdatesViaDataRoamingConnectionMessage');
          window.dispatchEvent(new CustomEvent('updatepromptshown'));
          this.downloadViaDataConnectionDialog.classList.add('visible');
          return;
        }
        this._startedDownloadUsingDataConnection = true;
        this.startDownloads();
      }.bind(this));
    },

    _getDataRoamingSetting: function um_getDataRoamingSetting() {
      var lock = this._settings.createLock();
      var reqDataRoaming = lock.get(this.ROAMING_SETTING_KEY);
      var dataRoamingSettingPromise;
      var self = this;

      dataRoamingSettingPromise = new Promise(function(resolve, reject) {
        reqDataRoaming.onsuccess = function() {
          resolve(reqDataRoaming.result[self.ROAMING_SETTING_KEY]);
        };

        reqDataRoaming.onerror = function() {
          resolve(false);
        };
      });

      return dataRoamingSettingPromise;
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

    _humanizeSize: function um_humanizeSize(bytes) {
      return mozIntl._gaia.getFormattedUnit('digital', 'short', bytes);
    },

    _closeDownloadDialog: function um_closeDownloadDialog() {
      window.dispatchEvent(new CustomEvent('updateprompthidden'));
      this.downloadDialog.classList.remove('visible');
    }
  };
  exports.UpdateManager = UpdateManager;
}(window));
