/**
 * Links the root panel list item with AppStorage.
 */
define(function(require) {
  'use strict';

  var SettingsUtils = require('modules/settings_utils');
  var AppStorage = require('modules/app_storage');

  /**
   * @alias module:panels/root/storage_app_item
   * @class AppStorageItem
   * @requires module:modules/app_storage
   * @param {HTMLElement} element
                          The element displaying the app storage information
   * @returns {AppStorageItem}
   */
  function AppStorageItem(element) {
    this._enabled = false;
    this._element = element;
    this._boundUpdateAppFreeSpace = this._updateAppFreeSpace.bind(this);
  }

  AppStorageItem.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the root panel context.
     *
     * @access public
     * @memberOf AppStorageItem.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      if (this._enabled === value) {
        return;
      } else {
        this._enabled = value;
      }
      if (value) { //observe
        AppStorage.storage.observe('freeSize', this._boundUpdateAppFreeSpace);
        this._updateAppFreeSpace();
        window.addEventListener('localized', this);
      } else { //unobserve
        AppStorage.storage.unobserve('freeSize', this._boundUpdateAppFreeSpace);
        window.removeEventListener('localized', this);
      }
    },

    // Application Storage
    _updateAppFreeSpace: function storage_updateAppFreeSpace() {
      SettingsUtils.DeviceStorageHelper.showFormatedSize(this._element,
        'availableSize', AppStorage.storage.freeSize);
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this._updateAppFreeSpace();
          break;
      }
    }
  };

  return function ctor_app_storage_item(element) {
    return new AppStorageItem(element);
  };
});
