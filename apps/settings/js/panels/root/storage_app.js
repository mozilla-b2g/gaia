/* global DeviceStorageHelper */
/**
 * Links the root panel list item with AppStorage.
 */
define(function(require) {
  'use strict';

  var AppStorage = require('modules/app_storage');

  function AppStoragePanel() {
    this._elements = null;
    this._enabled = false;
  }

  AppStoragePanel.prototype = {
    init: function app_storage_init(elements) {
      this._elements = elements;
    },
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
        AppStorage.storage.observe('freeSize',
          this.updateAppFreeSpace.bind(this));
        this.updateAppFreeSpace();
        window.addEventListener('localized', this);
      } else { //unobserve
        AppStorage.storage.unobserve('freeSize',
          this.updateAppFreeSpace.bind(this));
        window.removeEventListener('localized', this);
      }
    },

    // Application Storage
    updateAppFreeSpace: function storage_updateAppFreeSpace() {
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

  return function ctor_app_storage_panel() {
    return new AppStoragePanel();
  };
});
