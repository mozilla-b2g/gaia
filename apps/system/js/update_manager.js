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
  _downloadedBytes: 0,
  _errorTimeout: null,
  NOTIFICATION_BUFFERING_TIMEOUT: 30 * 1000,
  TOASTER_TIMEOUT: 1200,

  container: null,
  message: null,
  toaster: null,
  toasterMessage: null,
  laterButton: null,
  downloadButton: null,
  downloadDialog: null,
  downloadDialogTitle: null,
  downloadDialogList: null,

  updatableApps: [],
  updatesQueue: [],
  downloadsQueue: [],

  init: function um_init() {
    if (!this._mgmt) {
      this._mgmt = navigator.mozApps.mgmt;
    }

    this._mgmt.getAll().onsuccess = (function gotAll(evt) {
      var apps = evt.target.result;
      apps.forEach(function appIterator(app) {
        var updatableApp = new AppUpdatable(app);
        this.addToUpdatableApps(updatableApp);
        if (app.downloadAvailable) {
          this.addToUpdatesQueue(updatableApp);
        }
      }, this);
    }).bind(this);

    this.container = document.getElementById('update-manager-container');
    this.message = this.container.querySelector('.message');

    this.toaster = document.getElementById('update-manager-toaster');
    this.toasterMessage = this.toaster.querySelector('.message');

    this.laterButton = document.getElementById('updates-later-button');
    this.downloadButton = document.getElementById('updates-download-button');
    this.downloadDialog = document.getElementById('updates-download-dialog');
    this.downloadDialogTitle = this.downloadDialog.querySelector('h1');
    this.downloadDialogList = this.downloadDialog.querySelector('ul');

    this.container.onclick = this.containerClicked.bind(this);
    this.laterButton.onclick = this.cancelPrompt.bind(this);
    this.downloadButton.onclick = this.startAllDownloads.bind(this);

    window.addEventListener('mozChromeEvent', this);
    window.addEventListener('applicationinstall', this);
    window.addEventListener('applicationuninstall', this);

    SettingsListener.observe('gaia.system.checkForUpdates', false,
                             this.checkForUpdates.bind(this));
  },

  startAllDownloads: function um_startAllDownloads(evt) {
    evt.preventDefault();

    this.downloadDialog.classList.remove('visible');
    UtilityTray.show();

    this.updatesQueue.forEach(function(updatableApp) {
      updatableApp.download();
    });

    this._downloadedBytes = 0;
    this.render();
  },

  cancelAllDownloads: function um_cancelAllDownloads() {
    CustomDialog.hide();

    this.downloadsQueue.forEach(function(updatableApp) {
      updatableApp.cancelDownload();
    });
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
    var _ = navigator.mozL10n.get;

    this.downloadDialogTitle.textContent = _('updates', {
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
    this.updatesQueue.forEach(function updatableIterator(updatable) {
      var listItem = document.createElement('li');
      listItem.textContent = updatable.name;

      if (updatable.size) {
        var sizeItem = document.createElement('span');
        sizeItem.textContent = this._humanizeSize(updatable.size);
        listItem.appendChild(sizeItem);
      }

      this.downloadDialogList.appendChild(listItem);
    }, this);

    this.downloadDialog.classList.add('visible');
  },

  cancelPrompt: function um_cancelPrompt() {
    CustomDialog.hide();
      this.downloadDialog.classList.remove('visible');
  },

  downloadProgressed: function um_downloadProgress(bytes) {
    if (bytes > 0) {
      this._downloadedBytes += bytes;
      this.render();
    }
  },

  render: function um_render() {
    var _ = navigator.mozL10n.get;

    if (this._downloading) {
      this.container.classList.add('downloading');
      var humanProgress = this._humanizeSize(this._downloadedBytes);
      this.message.innerHTML = _('downloadingMessage', {
                                  progress: humanProgress
                                });
    } else {
      this.message.innerHTML = _('updatesAvailableMessage', {
                                 n: this.updatesQueue.length
                               });
      this.container.classList.remove('downloading');
    }

    this.toasterMessage.innerHTML = _('updatesAvailableMessage', {
                                      n: this.updatesQueue.length
                                    });
  },

  addToUpdatableApps: function um_addtoUpdatableapps(updatableApp) {
    this.updatableApps.push(updatableApp);
  },

  removeFromAll: function um_removeFromAll(updatableApp) {
    var removeIndex = this.updatableApps.indexOf(updatableApp);
    if (removeIndex === -1)
      return;

    var removedApp = this.updatableApps[removeIndex];
    if (removedApp.app.downloadAvailable) {
      this.removeFromUpdatesQueue(removedApp);
    }
    removedApp.uninit();
    this.updatableApps.splice(removeIndex, 1);
  },

  addToUpdatesQueue: function um_addToUpdatesQueue(updatable) {
    if (this._downloading)
      return;

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

    if (this.updatesQueue.length === 1) {
      var self = this;
      setTimeout(function waitForMore() {
        if (self.updatesQueue.length) {
          self.container.classList.add('displayed');
          self.toaster.classList.add('displayed');

          setTimeout(function waitToHide() {
            self.toaster.classList.remove('displayed');
          }, self.TOASTER_TIMEOUT);

          var initialCount = StatusBar.notificationsCount;
          StatusBar.updateNotification(initialCount + 1);
          StatusBar.updateNotificationUnread(true);
        }
      }, this.NOTIFICATION_BUFFERING_TIMEOUT);
    }

    this.render();
  },

  removeFromUpdatesQueue: function um_removeFromUpdatesQueue(updatable) {
    var removeIndex = this.updatesQueue.indexOf(updatable);
    if (removeIndex === -1)
      return;

    this.updatesQueue.splice(removeIndex, 1);
    if (this.updatesQueue.length === 0) {
      this.container.classList.remove('displayed');

      var initialCount = StatusBar.notificationsCount;
      if (initialCount >= 1) {
        StatusBar.updateNotification(initialCount - 1);
      }
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
      this.checkStatuses();
      this.render();
    }
  },

  checkStatuses: function um_checkStatuses() {
    this.updatableApps.forEach(function(updatableApp) {
      var app = updatableApp.app;
      if (app.installState === 'installed' && app.downloadAvailable) {
        this.addToUpdatesQueue(updatableApp);
      }
    }, this);
  },

  oninstall: function um_oninstall(evt) {
    var app = evt.application;
    var updatableApp = new AppUpdatable(app);
    this.addToUpdatableApps(updatableApp);
  },

  onuninstall: function um_onuninstall(evt) {
    this.updatableApps.some(function appIterator(updatableApp, index) {
      if (updatableApp.app === evt.application) {
        this.removeFromAll(updatableApp);
        return true;
      }
      return false;
    }, this);
  },

  handleEvent: function um_handleEvent(evt) {
    if (!evt.type)
      return;

    if (evt.type === 'applicationinstall') {
      this.oninstall(evt.detail);
      return;
    }

    if (evt.type === 'applicationuninstall') {
      this.onuninstall(evt.detail);
      return;
    }

    if (evt.type !== 'mozChromeEvent')
      return;

    var detail = evt.detail;
    if (!detail.type)
      return;

    switch (detail.type) {
      case 'update-available':
        this.addToUpdatesQueue(new SystemUpdatable(detail.size));
        break;
    }
  },

  checkForUpdates: function su_checkForUpdates(shouldCheck) {
    if (!shouldCheck) {
      return;
    }

    this._dispatchEvent('force-update-check');
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
