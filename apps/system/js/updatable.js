'use strict';

/* global
   asyncStorage,
   ManifestHelper,
   Service
 */

/*
 * An Updatable object represents an application *or* system update.
 * It takes care of the interaction with the UpdateManager and observes
 * the update itself to handle success/error cases.
 *
 * - name of the update
 * - size of the update
 * - download() to start the download
 * - cancelDownload() to cancel it
 */

/* === App Updates === */
function AppUpdatable(app) {
  this._mgmt = navigator.mozApps.mgmt;
  this.app = app;

  var manifest = app.manifest ? app.manifest : app.updateManifest;
  this.name = new ManifestHelper(manifest).name;
  this.nameL10nId = '';

  this.size = app.downloadSize;
  this.progress = null;

  Service.request('UpdateManager:addToUpdatableApps', this);
  app.ondownloadavailable = this.availableCallBack.bind(this);
  if (app.downloadAvailable) {
    this.availableCallBack();
  }
  if (app.readyToApplyDownload) {
    this.applyUpdate();
  }
}

AppUpdatable.prototype.download = function() {
  Service.request('UpdateManager:addToDownloadsQueue', this);
  this.progress = 0;

  this.app.download();
};

AppUpdatable.prototype.cancelDownload = function() {
  this.app.cancelDownload();
};

AppUpdatable.prototype.uninit = function() {
  this.app.ondownloadavailable = null;
  this.clean();
};

AppUpdatable.prototype.clean = function() {
  this.app.ondownloaderror = null;
  this.app.ondownloadsuccess = null;
  this.app.ondownloadapplied = null;
  this.app.onprogress = null;

  this.progress = null;
};

AppUpdatable.prototype.availableCallBack = function() {
  this.size = this.app.downloadSize;

  if (this.app.installState === 'installed') {
    Service.request('UpdateManager:addToUpdatesQueue', this);

    // we add these callbacks only now to prevent interfering
    // with other modules (especially the AppInstallManager)
    this.app.ondownloaderror = this.errorCallBack.bind(this);
    this.app.ondownloadsuccess = this.successCallBack.bind(this);
    this.app.ondownloadapplied = this.appliedCallBack.bind(this);
    this.app.onprogress = this.progressCallBack.bind(this);
  }
};

AppUpdatable.prototype.successCallBack = function() {
  var app = this.app;
  if (Service.query('AppWindowManager.getActiveWindow') &&
      Service.query('AppWindowManager.getActiveWindow').origin !==
      app.origin) {
    this.applyUpdate();
  } else {
    var self = this;
    window.addEventListener('appwillclose', function waitClose() {
      window.removeEventListener('appwillclose', waitClose);
      self.applyUpdate();
    });
  }

  Service.request('UpdateManager:downloaded', this);
  Service.request('UpdateManager:removeFromDownloadsQueue', this);
  Service.request('UpdateManager:removeFromUpdatesQueue', this);
};

AppUpdatable.prototype.applyUpdate = function() {
  Service.request('kill', this.app.origin);
  this._mgmt.applyDownload(this.app);
};

AppUpdatable.prototype.appliedCallBack = function() {
  this.clean();
};

AppUpdatable.prototype.errorCallBack = function(e) {
  var app = e.application;
  var errorName = app.downloadError.name;
  console.info('downloadError event, error code is', errorName);
  Service.request('UpdateManager:requestErrorBanner', this);
  Service.request('UpdateManager:removeFromDownloadsQueue', this);
  if (!app.downloadAvailable) {
    Service.request('UpdateManager:removeFromUpdatesQueue', this);
  }
  this.progress = null;
};

AppUpdatable.prototype.progressCallBack = function() {
  if (this.progress === null) {
    // this is the first progress
    Service.request('UpdateManager:addToDownloadsQueue', this);
    this.progress = 0;
  }

  var delta = this.app.progress - this.progress;

  this.progress = this.app.progress;
  Service.request('UpdateManager:downloadProgressed', delta);
};

/*
 * System Updates
 * Will be instanciated only once by the UpdateManager
 *
 */
function SystemUpdatable() {
  this.nameL10nId = 'systemUpdate';
  this.size = 0;
  this.downloading = false;
  this.paused = false;
  this.showingApplyPrompt = false;
  this._readyPromise = null;
  this._idleObserver = null;
  this._providerInfos = null;
  this._updateManager = window.navigator.updateManager;

  Service.register('updateCheck', this);

  this._initUpdateProvider();
  // XXX: this state should be kept on the platform side
  // https://bugzilla.mozilla.org/show_bug.cgi?id=827090
  this.checkKnownUpdate().then((value) => {
    if (value) {
      this.updateCheck();
    }
  });
}

SystemUpdatable.KNOWN_UPDATE_FLAG = 'known-sysupdate';
SystemUpdatable.APPLY_IDLE_TIMEOUT = 600;

SystemUpdatable.prototype._initUpdateProvider = function() {
  this._ready().then((provider) => {
    if (provider) {
      provider.addEventListener('updateavailable', this);
      provider.addEventListener('updateready', this);
      provider.addEventListener('progress', this);
      provider.addEventListener('error', this);
    }
  });
};

/**
 * Get active provider before perform other operations.
 * If can't get active provider from `getActiveProvider` api,
 * try to choose first provider and set it as the active provider.
 */
SystemUpdatable.prototype._ready = function() {
  if (!this._readyPromise) {
    this._readyPromise =
    this._updateManager.getProviders().then((providerInfos) => {
      this._providerInfos = providerInfos;
      return this._updateManager.getActiveProvider();
    }).then((activeProvider) => {
      if (!activeProvider) {
        if (this._providerInfos.length > 0) {
          return this._updateManager.setActiveProvider(
            this._providerInfos[0].uuid);
        } else {
          return Promise.reject();
        }
      } else {
        return activeProvider;
      }
    }).catch(() => {
      this.warn('No update provider.');
    });
  }
  return this._readyPromise;
},

SystemUpdatable.prototype.updateCheck = function() {
  this._ready().then((provider) => {
    if (provider) {
      provider.checkForUpdate();
    }
  });
};

SystemUpdatable.prototype.download = function() {
  if (this.downloading) {
    return;
  }

  this.downloading = true;
  this.paused = false;
  Service.request('UpdateManager:addToDownloadsQueue', this);
  this.progress = 0;

  this._ready().then((provider) => {
    provider.startDownload();
  });
};

SystemUpdatable.prototype.cancelDownload = function() {
  this._ready().then((provider) => {
    provider.stopDownload();
  });
  this.downloading = false;
  this.paused = false;
};

SystemUpdatable.prototype.uninit = function() {
  this._ready().then((provider) => {
    if (provider) {
      provider.removeEventListener('updateavailable', this);
      provider.removeEventListener('updateready', this);
      provider.removeEventListener('progress', this);
      provider.removeEventListener('error', this);
    }
  });
};

SystemUpdatable.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    case 'updateavailable':
      var packageInfo = evt.detail.packageInfo;
      this.size = packageInfo.size;
      this.rememberKnownUpdate();
      Service.request('UpdateManager:addToUpdatesQueue', this);
      break;
    case 'updateready':
      this.downloading = false;
      Service.request('UpdateManager:downloaded', this);
      this.showApplyPrompt(true);
      break;
    case 'progress':
      var delta = evt.loaded - this.progress;
      this.progress = evt.loaded;

      if (evt.loaded/evt.total === 1) {
        Service.request('UpdateManager:startedUncompressing');
      } else {
        Service.request('UpdateManager:downloadProgressed', delta);
      }
      break;
    case 'error':
      break;
  }
};

SystemUpdatable.prototype.errorCallBack = function() {
  Service.request('UpdateManager:requestErrorBanner');
  Service.request('UpdateManager:removeFromDownloadsQueue', this);
  this.downloading = false;
};

// isOsUpdate comes from Gecko's update object passed in the mozChromeEvent
// and is expected to be true in case of an update package that gets applied
// in recovery mode (FOTA). We want to show the battery warning only in this
// case as described in bug 959195
SystemUpdatable.prototype.showApplyPrompt = function(isOsUpdate) {
  var batteryLevel = window.navigator.battery.level * 100;
  this.getBatteryPercentageThreshold().then(function(threshold) {
    this.showingApplyPrompt = true;
    if (isOsUpdate && batteryLevel < threshold) {
      this.showApplyPromptBatteryNok(threshold);
    } else {
      this.showApplyPromptBatteryOk();
    }
  }.bind(this));
};

SystemUpdatable.prototype.BATTERY_FALLBACK_THRESHOLD = 25;

SystemUpdatable.prototype.getBatteryPercentageThreshold = function() {
  var fallbackThreshold = this.BATTERY_FALLBACK_THRESHOLD;

  var isCharging = window.navigator.battery.charging;
  var batteryThresholdKey =
    'app.update.battery-threshold.' + (isCharging ? 'plugged' : 'unplugged');

  var settings = window.navigator.mozSettings;
  var getRequest = settings.createLock().get(batteryThresholdKey);

  return new Promise(function(resolve, reject) {
    getRequest.onerror = function() {
      resolve(fallbackThreshold);
    };
    getRequest.onsuccess = function() {
      var threshold = getRequest.result[batteryThresholdKey];
      if (typeof threshold !== 'number') {
        threshold = fallbackThreshold;
      }
      if (threshold < 0 || threshold > 100) {
        threshold = fallbackThreshold;
      }
      resolve(threshold);
    };
  });
};

SystemUpdatable.prototype.showApplyPromptBatteryNok = function(minBattery) {
  var ok = {
    title: 'ok',
    callback: this.declineInstallBattery.bind(this)
  };

  Service.request('UtilityTray:hide');
  Service.request('showCustomDialog',
    'systemUpdateReady',
    { id: 'systemUpdateLowBatteryThreshold', args: { threshold: minBattery } },
    ok,
    null
  );
};

SystemUpdatable.prototype.showApplyPromptBatteryOk = function() {
  // Update will be completed after restart
  this.forgetKnownUpdate();

  var cancel = {
    title: 'later',
    callback: this.declineInstallWait.bind(this)
  };

  var confirm = {
    title: 'installNow',
    callback: this.acceptInstall.bind(this),
    recommend: true
  };

  Service.request('UtilityTray:hide');
  Service.request('showCustomDialog',
    'systemUpdateReady',
    'wantToInstallNow',
    cancel,
    confirm
  );
};

/**
 * Decline install of update, forwarding `reason` to UpdatePrompt.jsm.
 * `reason` is either 'wait' or 'low-battery'. 'wait' corresponds to the user
 * deciding to delay the update, in which case the prompt will reappear after a
 * few minutes of idle time. 'low-battery' means the battery is currently too
 * low for an update to take place and the update prompt will not reappear.
 * @param {String} reason
 */
SystemUpdatable.prototype.declineInstall = function(reason) {
  this.showingApplyPrompt = false;
  Service.request('hideCustomDialog');
  switch(reason) {
    case 'low-battery':
      // do nothing
      break;
    case 'wait':
      // register an idle observer and apply the update directly if users are
      // idle for more than ten minutes.
      this._registerIdleObserver();
      break;
  }
  Service.request('UpdateManager:removeFromDownloadsQueue', this);
};

SystemUpdatable.prototype.declineInstallBattery = function() {
  this.declineInstall('low-battery');
};

SystemUpdatable.prototype.declineInstallWait = function() {
  this.declineInstall('wait');
};

SystemUpdatable.prototype.acceptInstall = function() {
  Service.request('hideCustomDialog');

  // Display a splash-screen so the user knows an update is being applied
  var splash = document.createElement('form');
  splash.id = 'system-update-splash';
  ['label', 'divider', 'icon'].forEach(function(name) {
    var child = document.createElement('div');
    child.id = name;
    splash.appendChild(child);
  });
  splash.firstChild.setAttribute('data-l10n-id', 'systemUpdate');

  var screen = document.getElementById('screen');
  screen.appendChild(splash);

  this._ready().then((provider) => {
    provider.applyUpdate();
  });
};

SystemUpdatable.prototype.rememberKnownUpdate = function() {
  asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
};

SystemUpdatable.prototype.checkKnownUpdate = function() {
  return new Promise(function(resolve) {
    asyncStorage.getItem(SystemUpdatable.KNOWN_UPDATE_FLAG, function(value) {
      resolve(!!value);
    });
  });
};

SystemUpdatable.prototype.forgetKnownUpdate = function() {
  asyncStorage.removeItem(SystemUpdatable.KNOWN_UPDATE_FLAG);
};

SystemUpdatable.prototype._registerIdleObserver = function() {
  this._idleObserver = {
    time: SystemUpdatable.APPLY_IDLE_TIMEOUT,
    onidle: () => {
      this._ready().then((provider) => {
        provider.applyUpdate();
      });
    }
  };
  navigator.addIdleObserver(this._idleObserver);
};
