/* global DeviceStorageHelper */
/**
 * Links the root panel list item with USB Mass Storage(UMS).
 * Will disable Media Storage panel when UMS enabled.
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var MediaStorage = require('modules/media_storage');

  var _debug = false;
  var debug = function() {};
  if (_debug) {
    Debug = function storage_debug(msg) {
      console.log('--> [USBStorageItem]: ' + msg);
    };
  }

  /**
   * @alias module:panels/root/storage_usb_item
   * @class USBStorageItem
   * @param {Object} elements
                     elements displaying the usb and media storage information
   * @returns {USBStorageItem}
   */
  function USBStorageItem(elements) {
    this._enabled = false;
    this._elements = elements;
    this._keyUmsEnabled = 'ums.enabled';

    this._boundUmsEnabledHandler = this._umsEnabledHandler.bind(this);
    this._boundUpdateVolumeState = this._updateVolumeState.bind(this);
  }

  USBStorageItem.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the root panel context.
     *
     * @access public
     * @memberOf USBStorageItem.prototype
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
        SettingsListener.observe(this._keyUmsEnabled, false,
          this._boundUmsEnabledHandler);
        MediaStorage.observe('volumeState', this._boundUpdateVolumeState);
        MediaStorage.observe('freeSize', this._boundUpdateVolumeState);

        window.addEventListener('localized', this);
      } else { //unobserve
        SettingsListener.unobserve(this._keyUmsEnabled,
          this._boundUmsEnabledHandler);
        MediaStorage.unobserve('volumeState', this._boundUpdateVolumeState);
        MediaStorage.unobserve('freeSize', this._boundUpdateVolumeState);

        window.removeEventListener('localized', this);
      }
    },

    _umsEnabledHandler: function storage_umsEnabledHandler(enabled) {
      Debug('_umsEnabledHandler');
      this._enabled = enabled;
      this._updateUmsDesc();
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this._updateVolumeState();
          break;
      }
    },

    // ums description
    _updateUmsDesc: function storage_updateUmsDesc() {
      var key;
      Debug('enabled:' + this._enabled + '/' +
            'volumeState:' + MediaStorage.volumeState);
      if (this._enabled) {
        //TODO list all enabled volume name
        key = 'enabled';
      } else if (MediaStorage.volumeState === 'shared') {
        key = 'umsUnplugToDisable';
      } else {
        key = 'disabled';
      }
      this._elements.usbEnabledInfoBlock.setAttribute('data-l10n-id', key);
    },

    _updateVolumeState: function storage_updateVolumeState() {
      Debug('_updateVolumeState');
      this._updateUmsDesc();
      switch (MediaStorage.volumeState) {
        case 'available':
          DeviceStorageHelper.showFormatedSize(this._elements.mediaStorageDesc,
            'availableSize', MediaStorage.freeSize);
          this._lockMediaStorageMenu(false);
          break;

        case 'shared':
          this._elements.mediaStorageDesc.removeAttribute('data-l10n-id');
          this._elements.mediaStorageDesc.textContent = '';
          this._lockMediaStorageMenu(false);
          break;

        case 'unavailable':
          this._elements.mediaStorageDesc.setAttribute('data-l10n-id',
                                                       'no-storage');
          this._lockMediaStorageMenu(true);
          break;
      }
    },

    _lockMediaStorageMenu: function storage_setMediaMenuState(lock) {
      if (lock) {
        this._elements.mediaStorageSection.setAttribute('aria-disabled', true);
      } else {
        this._elements.mediaStorageSection.removeAttribute('aria-disabled');
      }
    }
  };

  return function ctor_usb_storage_item(elements) {
    return new USBStorageItem(elements);
  };
});
