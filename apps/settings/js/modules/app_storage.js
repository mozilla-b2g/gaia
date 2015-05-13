/**
 * AppStorage is a singleton that caches app storage values for
 * app storage and root panel fast access
 */
define(function(require) {
  'use strict';

  var Observable = require('modules/mvvm/observable');

  var AppStorage = function() {
    this._enabled = false;
    this._appStorage = navigator.getDeviceStorage('apps');

    this.storage = Observable({
      usedPercentage: 0,
      totalSize: 0,
      usedSize: 0,
      freeSize: 0
    });
  };

  AppStorage.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the app storage.
     *
     * @access public
     * @memberOf AppStorage.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      // early return if the value is not changed
      if (this._enabled === value) {
        return;
      } else {
        this._enabled = value;
      }
      if (value) {
        this._attachListeners();
        this._getSpaceInfo();
      } else {
        this._detachListeners();
      }
    },

    updateInfo: function as_updateInfo() {
      this._getSpaceInfo();
    },

    _attachListeners: function as_attachListeners() {
      this._appStorage.addEventListener('change', this);
    },

    _detachListeners: function as_detachListeners() {
      this._appStorage.removeEventListener('change', this);
    },

    handleEvent: function as_handler(evt) {
      switch (evt.type) {
        case 'change':
          this._getSpaceInfo();
          break;
      }
    },

    _getSpaceInfo: function as_getSpaceInfo() {
      var deviceStorage = this._appStorage;

      if (!deviceStorage) {
        console.error('Cannot get DeviceStorage for: app');
        return;
      }
      deviceStorage.freeSpace().onsuccess = function(e) {
        this.storage.freeSize = e.target.result;
        deviceStorage.usedSpace().onsuccess = function(e) {
          this.storage.usedSize = e.target.result;
          // calculate the percentage to show a space usage bar
          this.storage.totalSize =
            this.storage.usedSize + this.storage.freeSize;
          var usedPercentage = (this.storage.totalSize === 0) ?
            0 : (this.storage.usedSize * 100 / this.storage.totalSize);
          if (usedPercentage > 100) {
            usedPercentage = 100;
          }
          this.storage.usedPercentage = usedPercentage;
        }.bind(this);
      }.bind(this);
    }
  };

  // return singleton
  var instance = new AppStorage();
  instance.enabled = true;
  return instance;
});

