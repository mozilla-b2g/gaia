'use strict';

(function(exports) {
  /*
   * System Updates
   * Will be instanciated only once by the UpdateManager
   *
   */
  var SystemUpdatable = function(updateManager) {
    this.updateManager = updateManager;
    this.nameL10nId = 'systemUpdate';
    this.size = 0;
    this.downloading = false;
    this.paused = false;

    // XXX: this state should be kept on the platform side
    // https://bugzilla.mozilla.org/show_bug.cgi?id=827090
    this.checkKnownUpdate(this.updateManager.checkForUpdates.bind(this.updateManager));

    window.addEventListener('mozChromeEvent', this);
  };
  System.create(SystemUpdatable);

  SystemUpdatable.KNOWN_UPDATE_FLAG = 'known-sysupdate';

  SystemUpdatable.prototype.download = function() {
    if (this.downloading) {
      return;
    }

    this.downloading = true;
    this.paused = false;
    this.updateManager.addToDownloadsQueue(this);
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
    if (evt.type !== 'mozChromeEvent')
      return;

    var detail = evt.detail;
    if (!detail.type)
      return;

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

        this.updateManager.downloadProgressed(delta);
        break;
      case 'update-download-stopped':
        // TODO UpdateManager glue
        this.paused = detail.paused;
        if (!this.paused) {
          this.updateManager.startedUncompressing();
        }
        break;
      case 'update-downloaded':
        this.downloading = false;
        this.updateManager.downloaded(this);
        this.showApplyPrompt();
        break;
      case 'update-prompt-apply':
        this.showApplyPrompt();
        break;
    }
  };

  SystemUpdatable.prototype.errorCallBack = function() {
    this.updateManager.requestErrorBanner();
    this.updateManager.removeFromDownloadsQueue(this);
    this.downloading = false;
  };

  SystemUpdatable.prototype.showApplyPrompt = function() {
    var batteryLevel = window.navigator.battery.level * 100;
    this.getBatteryPercentageThreshold().then(function(threshold) {
      if (batteryLevel < threshold) {
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
        resolve(threshold);
      };
    });
  };

  SystemUpdatable.prototype.showApplyPromptBatteryNok = function(minBattery) {
    var _ = navigator.mozL10n.get;

    var ok = {
      title: _('ok'),
      callback: this.declineInstall.bind(this)
    };

    UtilityTray.hide();
    CustomDialog.show(
      _('systemUpdateReady'),
      _('systemUpdateLowBatteryThreshold', { threshold: minBattery }),
      ok
    );
  };

  SystemUpdatable.prototype.showApplyPromptBatteryOk = function() {
    var _ = navigator.mozL10n.get;

    // Update will be completed after restart
    this.forgetKnownUpdate();

    var cancel = {
      title: _('later'),
      callback: this.declineInstall.bind(this)
    };

    var confirm = {
      title: _('installNow'),
      callback: this.acceptInstall.bind(this),
      recommend: true
    };

    UtilityTray.hide();
    CustomDialog.show(_('systemUpdateReady'), _('wantToInstall'),
                      cancel, confirm);
  };

  SystemUpdatable.prototype.declineInstall = function() {
    CustomDialog.hide();
    this._dispatchEvent('update-prompt-apply-result', 'wait');

    this.updateManager.removeFromDownloadsQueue(this);
  };

  SystemUpdatable.prototype.acceptInstall = function() {
    CustomDialog.hide();
    this._dispatchEvent('update-prompt-apply-result', 'restart');
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
}(window));
