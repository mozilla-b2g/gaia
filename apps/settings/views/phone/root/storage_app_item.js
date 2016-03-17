/**
 * Links the root panel list item with AppStorage.
 */
define(function(require) {
  'use strict';

  var AppStorage = require('modules/app_storage');
  var StorageHelper = require('modules/storage_helper');

  /**
   * @alias module:views/phone/root/storage_app_item
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
        AppStorage.observe('freeSize', this._boundUpdateAppFreeSpace);
        this._updateAppFreeSpace();
        document.addEventListener('DOMRetranslated', this);
      } else { //unobserve
        AppStorage.unobserve('freeSize', this._boundUpdateAppFreeSpace);
        document.removeEventListener('DOMRetranslated', this);
      }
    },

    // Application Storage
    _updateAppFreeSpace: function storage_updateAppFreeSpace() {
      StorageHelper.showFormatedSize(this._element,
        'availableSize', AppStorage.freeSize);
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'DOMRetranslated':
          this._updateAppFreeSpace();
          break;
      }
    }
  };

  return function ctor_app_storage_item(element) {
    return new AppStorageItem(element);
  };
});
