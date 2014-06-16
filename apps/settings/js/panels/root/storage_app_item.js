/* global DeviceStorageHelper */
/**
 * Links the root panel list item with AppStorage.
 */
define(function(require) {
  'use strict';

  var AppStorage = require('modules/app_storage');

  function AppStorageItem(elements) {
    this._elements = elements;
    this._enabled = false;
    this._updateAppFreeSpace = this._updateAppFreeSpace.bind(this);
  }

  AppStorageItem.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the root panel context.
     *
     * @access public
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      this._enabled = value;
      if (value) { //observe
        AppStorage.storage.observe('freeSize', this._updateAppFreeSpace);
        this._updateAppFreeSpace();
        window.addEventListener('localized', this);
      } else { //unobserve
        AppStorage.storage.unobserve('freeSize', this._updateAppFreeSpace);
        window.removeEventListener('localized', this);
      }
    },

    // Application Storage
    _updateAppFreeSpace: function storage_updateAppFreeSpace() {
      DeviceStorageHelper.showFormatedSize(this._elements.appStorageDesc,
        'availableSize', AppStorage.storage.freeSize);
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this.updateAppFreeSpace();
          break;
      }
    }
  };

  return function ctor_app_storage_item(elements) {
    return new AppStorageItem(elements);
  };
});
