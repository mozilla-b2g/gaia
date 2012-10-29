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
  _errorTimeout: null,
  NOTIFICATION_BUFFERING_TIMEOUT: 60 * 1000,
  TOASTER_TIMEOUT: 1200,

  container: null,
  count: null,
  message: null,
  toaster: null,
  toasterCount: null,
  toasterMessage: null,

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
        var updatableApp = new Updatable(app);
        this.addToUpdatableApps(updatableApp);
        if (app.downloadAvailable) {
          this.addToUpdatesQueue(updatableApp);
        }
      }, this);
    }).bind(this);

    this.container = document.getElementById('update-manager-container');
    this.count = this.container.querySelector('.count');
    this.message = this.container.querySelector('.message');

    this.toaster = document.getElementById('update-manager-toaster');
    this.toasterCount = this.toaster.querySelector('.count');
    this.toasterMessage = this.toaster.querySelector('.message');

    this.container.onclick = this.containerClicked.bind(this);

    window.addEventListener('mozChromeEvent', this);
    window.addEventListener('applicationinstall', this);
    window.addEventListener('applicationuninstall', this);

    SettingsListener.observe('gaia.system.checkForUpdates', false,
                             this.checkForUpdates.bind(this));
  },

  startAllDownloads: function um_startAllDownloads() {
    CustomDialog.hide();
    UtilityTray.show();

    this.updatesQueue.forEach(function(updatableApp) {
      updatableApp.download();
    });
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

    var cancel, confirm, title, body;

    if (this._downloading) {
      cancel = {
        title: _('no'),
        callback: this.cancelPrompt.bind(this)
      };

      confirm = {
        title: _('yes'),
        callback: this.cancelAllDownloads.bind(this)
      };

      title = _('cancelAllDownloads');
      body = _('wantToCancelAll');
    } else {
      cancel = {
        title: _('later'),
        callback: this.cancelPrompt.bind(this)
      };

      confirm = {
        title: _('download'),
        callback: this.startAllDownloads.bind(this)
      };

      title = _('downloadAll');
      body = _('wantToDownloadAll');
    }

    CustomDialog.show(title, body, cancel, confirm);
    UtilityTray.hide();
  },

  cancelPrompt: function um_cancelPrompt() {
    CustomDialog.hide();
  },

  render: function um_render() {
    var _ = navigator.mozL10n.get;

    if (this._downloading) {
      this.container.classList.add('downloading');
      this.message.innerHTML = _('downloadingMessage');
    } else {
      this.message.innerHTML = _('updatesAvailableMessage', {
                                 n: this.updatesQueue.length
                               });
      this.container.classList.remove('downloading');
    }

    this.count.textContent = this.updatesQueue.length;
    this.toasterCount.textContent = this.updatesQueue.length;
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
    if (removedApp.target.downloadAvailable) {
      this.removeFromUpdatesQueue(removedApp);
    }
    removedApp.uninit();
    this.updatableApps.splice(removeIndex, 1);
  },

  addToUpdatesQueue: function um_addToUpdatesQueue(updatable) {
    if (this._downloading)
      return;

    if (updatable.target !== 'system' &&
        this.updatableApps.indexOf(updatable) === -1) {
      return;
    }

    var alreadyThere = this.updatesQueue.some(function lookup(u) {
      return (u.target === updatable.target);
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
    }

    this.render();
  },

  addToDownloadsQueue: function um_addToDownloadsQueue(updatable) {
    if (updatable.target !== 'system' &&
        this.updatableApps.indexOf(updatable) === -1) {
      return;
    }

    var alreadyThere = this.downloadsQueue.some(function lookup(u) {
      return (u.target === updatable.target);
    });
    if (alreadyThere) {
      return;
    }

    this.downloadsQueue.push(updatable);

    if (this.downloadsQueue.length === 1) {
      this._downloading = true;
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
      this.checkStatuses();
      this.render();
    }
  },

  checkStatuses: function um_checkStatuses() {
    this.updatableApps.forEach(function(updatableApp) {
      if (updatableApp.target.downloadAvailable) {
        this.addToUpdatesQueue(updatableApp);
      }
    }, this);
  },

  oninstall: function um_oninstall(evt) {
    var updatableApp = new Updatable(evt.application);
    this.addToUpdatableApps(updatableApp);
    if (evt.application.downloadAvailable) {
      this.addToUpdatesQueue(updatableApp);
    }
  },

  onuninstall: function um_onuninstall(evt) {
    this.updatableApps.some(function appIterator(updatableApp, index) {
      if (updatableApp.target === evt.application) {
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
        this.addToUpdatesQueue(new Updatable('system'));
        break;
    }
  },

  checkForUpdates: function su_checkForUpdates(shouldCheck) {
    if (!shouldCheck) {
      return;
    }

    this._dispatchEvent('force-update-check');
  },

  _dispatchEvent: function su_dispatchEvent(type, result) {
    var event = document.createEvent('CustomEvent');
    var data = { type: type };
    if (result) {
      data.result = result;
    }

    event.initCustomEvent('mozContentEvent', true, true, data);
    window.dispatchEvent(event);
  }
};

UpdateManager.init();
