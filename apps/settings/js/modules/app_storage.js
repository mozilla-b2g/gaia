/**
 * AppStorage is a singleton that caches app storage values for
 * app storage and root panel fast access
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  /**
   * @class AppStorage
   * @requires module:modules/base/module
   * @requires module:modules/mvvm/observable
   * @returns {AppStorage}
   */
  var AppStorage = Module.create(function AppStorage() {
    this.super(Observable).call(this);
    this._appStorage = navigator.getDeviceStorage('apps');

    this._attachListeners();
    this._getSpaceInfo();
  }).extend(Observable);

  Observable.defineObservableProperty(AppStorage.prototype,
    'usedPercentage', {
      readonly: true,
      value: 0
  });

  Observable.defineObservableProperty(AppStorage.prototype,
    'totalSize', {
      readonly: true,
      value: 0
  });

  Observable.defineObservableProperty(AppStorage.prototype,
    'usedSize', {
      readonly: true,
      value: 0
  });

  Observable.defineObservableProperty(AppStorage.prototype,
    'freeSize', {
      readonly: true,
      value: 0
  });


  AppStorage.prototype.updateInfo = function as_updateInfo() {
    this._getSpaceInfo();
  };

  AppStorage.prototype._attachListeners = function as_attachListeners() {
    this._appStorage.addEventListener('change', this);
  };

  AppStorage.prototype.handleEvent = function as_handler(evt) {
    switch (evt.type) {
      case 'change':
        this._getSpaceInfo();
        break;
    }
  };

  AppStorage.prototype._getSpaceInfo = function as_getSpaceInfo() {
    var deviceStorage = this._appStorage;

    if (!deviceStorage) {
      console.error('Cannot get DeviceStorage for: app');
      return;
    }
    deviceStorage.freeSpace().onsuccess = (e) => {
      this._freeSize = e.target.result;
      deviceStorage.usedSpace().onsuccess = (e) => {
        this._usedSize = e.target.result;
        // calculate the percentage to show a space usage bar
        this._totalSize =
          this._usedSize + this._freeSize;
        var usedPercentage = (this._totalSize === 0) ?
          0 : (this._usedSize * 100 / this._totalSize);
        if (usedPercentage > 100) {
          usedPercentage = 100;
        }
        this._usedPercentage = usedPercentage;
      };
    };
  };

  return AppStorage();
});

