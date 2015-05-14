define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');
  var ObservableArray = require('modules/mvvm/observable_array');
  var SettingsCache = require('modules/settings_cache');

  const UPDATE_STATUS = {
    CHECKING: 0,
    UPDATE_AVAILABLE: 1,
    UPDATE_READY: 2,
    UPDATE_UNAVAILABLE: 3,
    ALREADY_LATEST_VERSION: 4,
    OFFLINE: 5,
    ERROR: 6,
    UNKNOWN: -1
  };

  const APP_UPDATE_KEY = 'apps.updateStatus';

  var SystemUpdateManager = Module.create(function SystemUpdateManager() {
    if (!window.navigator.updateManager) {
      this.throw('Update service is not available');
    }

    this.super(Observable).call(this);

    this._updateManager = window.navigator.updateManager;
    this._providerInfos = ObservableArray([]);
    this._activeProvider = null;
    this._readyPromise = null;
    this._availableUpdate = null;

    SettingsCache.getSettings((results) => {
      this._lastUpdateDate = results['deviceinfo.last_updated'];
    });
  }).extend(Observable);

  Observable.defineObservableProperty(SystemUpdateManager.prototype, 'status', {
    readonly: true,
    value: UPDATE_STATUS.UNKNOWN
  });

  Observable.defineObservableProperty(SystemUpdateManager.prototype,
    'lastUpdateDate', {
      readonly: true,
      value: null
  });

  Observable.defineObservableProperty(SystemUpdateManager.prototype,
    'availableUpdate', {
      readonly: true,
      value: null
  });

  SystemUpdateManager.prototype._ready = function() {
    if (!this._readyPromise) {
      this._readyPromise =
      this._updateManager.getProviders().then((providerInfos) => {
        this._providerInfos.reset(providerInfos);
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
      }).then((activeProvider) => {
        this._activeProvider = activeProvider;
        this._activeProvider.addEventListener('updateavailable',
          this._onUpdateAvailable.bind(this));
        this._activeProvider.addEventListener('updateready',
          this._onUpdateReady.bind(this));
        this._activeProvider.addEventListener('error',
          this._onError.bind(this));
      }).catch(() => {
        this.warn('No update provider.');
      });
    }
    return this._readyPromise;
  };

  /**
   * possible return values:
   *
   * - for system updates:
   *   - no-updates
   *   - already-latest-version
   *   - check-complete
   *   - retry-when-online
   *   - check-error-$nsresult
   *   - check-error-http-$code
   *
   * - for apps updates:
   *   - check-complete
   *
   * use
   * http://mxr.mozilla.org/mozilla-central/ident?i=setUpdateStatus&tree=mozilla-central&filter=&strict=1
   * to check if this is still current
   */

  SystemUpdateManager.prototype._onUpdateAvailable = function(event) {
    this._availableUpdate = event.detail.packageInfo;
    this._status = UPDATE_STATUS.UPDATE_AVAILABLE;
  };

  SystemUpdateManager.prototype._onUpdateReady = function() {
    this._status = UPDATE_STATUS.UPDATE_READY;
  };

  SystemUpdateManager.prototype._onError = function(event) {
    this._availableUpdate = null;
    switch(event.message) {
      case 'no-updates':
        this._status = UPDATE_STATUS.UPDATE_UNAVAILABLE;
        break;
      case 'already-latest-version':
        this._status = UPDATE_STATUS.ALREADY_LATEST_VERSION;
        break;
      case 'retry-when-online':
        this._status = UPDATE_STATUS.OFFLINE;
        break;
      default:
        this._status = UPDATE_STATUS.ERROR;
        break;
    }
  };

  SystemUpdateManager.prototype.checkForUpdate = function() {
    this._ready().then(() => {
      if (this._activeProvider) {
        this._status = UPDATE_STATUS.CHECKING;
        this._activeProvider.checkForUpdate();

        // XXX: provider.checkForUpdate also triggers checking for web app
        //      update. Setting to settings db is ugly but the only way to
        //      keep the app update status consistent. In the long term we
        //      should have web api for checking web app update.
        window.navigator.mozSettings.createLock().set({
          [APP_UPDATE_KEY]: 'checking' 
        });
      }
    });
  };

  var instance = new SystemUpdateManager();
  Object.defineProperty(instance, 'UPDATE_STATUS', {
    get: function() {
      return UPDATE_STATUS;
    }
  });
  return instance;
});
