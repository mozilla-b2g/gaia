'use strict';

/* global
   appWindowManager,
   asyncStorage,
   CustomDialog,
   ManifestHelper,
   Service,
   UpdateManager,
   UtilityTray
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

  UpdateManager.addToUpdatableApps(this);
  app.ondownloadavailable = this.availableCallBack.bind(this);
  if (app.downloadAvailable) {
    this.availableCallBack();
  }
  if (app.readyToApplyDownload) {
    this.applyUpdate();
  }
}

AppUpdatable.prototype.download = function() {
  UpdateManager.addToDownloadsQueue(this);
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
    UpdateManager.addToUpdatesQueue(this);

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
  if (Service.currentApp &&
      Service.currentApp.origin !== app.origin) {
    this.applyUpdate();
  } else {
    var self = this;
    window.addEventListener('appwillclose', function waitClose() {
      window.removeEventListener('appwillclose', waitClose);
      self.applyUpdate();
    });
  }

  UpdateManager.downloaded(this);
  UpdateManager.removeFromDownloadsQueue(this);
  UpdateManager.removeFromUpdatesQueue(this);
};

AppUpdatable.prototype.applyUpdate = function() {
  appWindowManager.kill(this.app.origin);
  this._mgmt.applyDownload(this.app);
};

AppUpdatable.prototype.appliedCallBack = function() {
  this.clean();
};

AppUpdatable.prototype.errorCallBack = function(e) {
  var app = e.application;
  var errorName = app.downloadError.name;
  console.info('downloadError event, error code is', errorName);
  UpdateManager.requestErrorBanner();
  UpdateManager.removeFromDownloadsQueue(this);
  if (!app.downloadAvailable) {
    UpdateManager.removeFromUpdatesQueue(this);
  }
  this.progress = null;
};

AppUpdatable.prototype.progressCallBack = function() {
  if (this.progress === null) {
    // this is the first progress
    UpdateManager.addToDownloadsQueue(this);
    this.progress = 0;
  }

  var delta = this.app.progress - this.progress;

  this.progress = this.app.progress;
  UpdateManager.downloadProgressed(delta);
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
  this.updateObject = null;

  // XXX: this state should be kept on the platform side
  // https://bugzilla.mozilla.org/show_bug.cgi?id=827090
  this.checkKnownUpdate(UpdateManager.checkForUpdates.bind(UpdateManager));

  window.addEventListener('mozChromeEvent', this);
}

SystemUpdatable.KNOWN_UPDATE_FLAG = 'known-sysupdate';

SystemUpdatable.prototype.download = function() {
  if (this.downloading) {
    return;
  }

  this.downloading = true;
  this.paused = false;
  UpdateManager.addToDownloadsQueue(this);
  this.progress = 0;
  this._dispatchEvent('update-available-result', 'download');
};

SystemUpdatable.prototype.cancelDownload = function() {
  this._dispatchEvent('update-download-cancel');
  this.downloading = false;
  this.paused = false;
};

SystemUpdatable.prototype.uninit = function() {
  window.removeEventListener('mozChromeEvent', this);
};

SystemUpdatable.prototype.handleEvent = function(evt) {
  if (evt.type !== 'mozChromeEvent') {
    return;
  }

  var detail = evt.detail;
  if (!detail.type) {
    return;
  }

  switch (detail.type) {
    case 'update-error':
      this.errorCallBack();
      break;
    case 'update-download-started':
      // TODO UpdateManager glue
      this.paused = false;
      break;
    case 'update-download-progress':
      var delta = detail.progress - this.progress;
      this.progress = detail.progress;

      UpdateManager.downloadProgressed(delta);
      break;
    case 'update-download-stopped':
      // TODO UpdateManager glue
      this.paused = detail.paused;
      if (!this.paused) {
        UpdateManager.startedUncompressing();
      }
      break;
    case 'update-downloaded':
      this.downloading = false;
      UpdateManager.downloaded(this);
      this.showApplyPrompt(detail.isOSUpdate);
      break;
    case 'update-prompt-apply':
      this.showApplyPrompt(detail.isOSUpdate);
      break;
  }
};

SystemUpdatable.prototype.errorCallBack = function() {
  UpdateManager.requestErrorBanner();
  UpdateManager.removeFromDownloadsQueue(this);
  this.downloading = false;
};

// isOsUpdate comes from Gecko's update object passed in the mozChromeEvent
// and is expected to be true in case of an update package that gets applied
// in recovery mode (FOTA). We want to show the battery warning only in this
// case as described in bug 959195
SystemUpdatable.prototype.showApplyPrompt = function(isOsUpdate) {
  var batteryLevel = window.navigator.battery.level * 100;
  this.getBatteryPercentageThreshold().then(function(threshold) {
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

  var screen = document.getElementById('screen');

  UtilityTray.hide();
  CustomDialog.show(
    'systemUpdateReady',
    { id: 'systemUpdateLowBatteryThreshold', args: { threshold: minBattery } },
    ok,
    null,
    screen
  )
  .setAttribute('data-z-index-level', 'system-dialog');
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

  var screen = document.getElementById('screen');

  UtilityTray.hide();
  CustomDialog.show(
    'systemUpdateReady',
    'wantToInstallNow',
    cancel,
    confirm,
    screen
  )
  .setAttribute('data-z-index-level', 'system-dialog');
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
  CustomDialog.hide();
  this._dispatchEvent('update-prompt-apply-result', reason);

  UpdateManager.removeFromDownloadsQueue(this);
};

SystemUpdatable.prototype.declineInstallBattery = function() {
  this.declineInstall('low-battery');
};

SystemUpdatable.prototype.declineInstallWait = function() {
  this.declineInstall('wait');
};


SystemUpdatable.prototype.acceptInstall = function() {
  CustomDialog.hide();

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

  this._dispatchEvent('update-prompt-apply-result', 'restart');
};

SystemUpdatable.prototype.getUpdateDetails = function() {
  return document.getElementById('updates-Details-dialog');
};

SystemUpdatable.prototype.setUpdate = function(aUpdate) {
  this.updateObject = aUpdate;

  var details = this.getUpdateDetails();
  if (!details) {
    console.error('Unable to get update details dialog: ', details);
    return;
  }

  var parentNode = details.querySelector('#update-Details-infos ul');
  if (!parentNode) {
    console.error('Unable to get update details parent node: ', parentNode);
    return;
  }

  var avoid = [ 'detailsURL', 'isOSUpdate' ];
  for (var p in this.updateObject) {
    if (avoid.indexOf(p) >= 0) {
      continue;
    }

    var span = document.createElement('span');
    span.setAttribute('data-l10n-id', 'systemUpdateDetails-' + p);

    var small = document.createElement('small');
    small.textContent = this.updateObject[p];

    var li = document.createElement('li');
    li.appendChild(span);
    li.appendChild(small);

    parentNode.appendChild(li);
  }

  this.fetchReleaseNotes();
};

SystemUpdatable.prototype.fetchReleaseNotes = function() {
  var relnoteNode = document.querySelector('#update-Details-relnote p');
  if (!relnoteNode) {
    console.error('Unable to get update details release notes node');
    return;
  }

  var url = this.getUpdate().detailsURL;

  var xhr = new XMLHttpRequest({mozSystem: true});
  xhr.open('GET', url, true);

  xhr.addEventListener('readystatechange', function(evt) {
    if (evt.target.readyState !== XMLHttpRequest.DONE) {
      return;
    }

    if (evt.target.status !== 200) {
      console.debug('XHR for ' + url + ' received unexpected status ' +
                    evt.target.status);
      return;
    }

    relnoteNode.textContent = evt.target.responseText;

    // Will hide the loading text and show the actual content
    relnoteNode.parentNode.dataset.relnotes = true;
  });

  xhr.send();
};

SystemUpdatable.prototype.getUpdate = function() {
  return this.updateObject;
};

SystemUpdatable.prototype.hideUpdateDetails = function() {
  var details = this.getUpdateDetails();
  if (details.classList.contains('visible')) {
    details.classList.remove('visible');
  }
  details.classList.add('hidden');
};

SystemUpdatable.prototype.showUpdateDetails = function() {
  var details = this.getUpdateDetails();
  if (details.classList.contains('hidden')) {
    details.classList.remove('hidden');
  }
  details.classList.add('visible');
};

SystemUpdatable.prototype.rememberKnownUpdate = function() {
  asyncStorage.setItem(SystemUpdatable.KNOWN_UPDATE_FLAG, true);
};

SystemUpdatable.prototype.checkKnownUpdate = function(callback) {
  if (typeof callback !== 'function') {
    return;
  }

  asyncStorage.getItem(SystemUpdatable.KNOWN_UPDATE_FLAG, function(value) {
    callback(!!value);
  });
};

SystemUpdatable.prototype.forgetKnownUpdate = function() {
  asyncStorage.removeItem(SystemUpdatable.KNOWN_UPDATE_FLAG);
};

SystemUpdatable.prototype._dispatchEvent = function(type, result) {
  var event = document.createEvent('CustomEvent');
  var data = { type: type };
  if (result) {
    data.result = result;
  }

  event.initCustomEvent('mozContentEvent', true, true, data);
  window.dispatchEvent(event);
};

console.debug('Will create fake SystemUpdatable ...');
window.addEventListener('load', function() {
  var fakeUpdate = {
    appVersion: '',
    buildID: '',
    detailsURL:
      'http://builds.firefoxos.mozfr.org/openc/nightly/sha1.checksums',
    displayVersion: '',
    isOSUpdate: true,
    platformVersion: '',
    previousAppVersion: '',
    state: 0,
    statusText: '',
  };
  console.debug('Will instantiate fake SystemUpdatable ...');
  var systemUpdate = new SystemUpdatable();
  console.debug('Instantiated fake SystemUpdatable: ' + systemUpdate);
  systemUpdate.setUpdate(fakeUpdate);
  systemUpdate.showUpdateDetails();
});
