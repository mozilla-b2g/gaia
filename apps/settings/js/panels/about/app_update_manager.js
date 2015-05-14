define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  const UPDATE_STATUS = {
    CHECKING: 0,
    UPDATE_AVAILABLE: 1,
    UPDATE_UNAVAILABLE: 2,
    UNKNOWN: -1
  };

  const APP_UPDATE_KEY = 'apps.updateStatus';

  var AppUpdateManager = Module.create(function AppUpdateManager() {
    if (!window.navigator.mozSettings) {
      this.throw('mozSettings is not available');
    }

    this.super(Observable).call(this);
    
    this._settings = window.navigator.mozSettings;
    this._settings.createLock().set({
      [APP_UPDATE_KEY]: null 
    });
    this._settings.addObserver(APP_UPDATE_KEY, (event) => {
      this._onUpdateStatusChange(event.settingValue);
    });
  }).extend(Observable);

  Observable.defineObservableProperty(AppUpdateManager.prototype, 'status', {
    readonly: true,
    value: UPDATE_STATUS.UNKNOWN
  });

  AppUpdateManager.prototype._onUpdateStatusChange = function(status) {
    switch(status) {
      case null:
        this._status = UPDATE_STATUS.UNKNOWN;
        break;
      case 'checking':
        this._status = UPDATE_STATUS.CHECKING;
        break;
      case 'check-complete':
        this._status = UPDATE_STATUS.UPDATE_AVAILABLE;
        break;
      case 'no-updates':
        this._status = UPDATE_STATUS.UPDATE_UNAVAILABLE;
        break;
    }
  };

  var instance = new AppUpdateManager();
  Object.defineProperty(instance, 'UPDATE_STATUS', {
    get: function() {
      return UPDATE_STATUS;
    }
  });
  return instance;
});
