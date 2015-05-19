/* global DeviceStorageHelper */
/**
 * Links the root panel list item with Media Storage.
 */
define(function(require) {
  'use strict';

  var DeviceStorages = require('modules/storage/device_storages');
  var DefaultMediaVolume = require('modules/storage/default_media_volume');

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function smi_debug(msg) {
      console.log('--> [StorageMediaItem]: ' + msg);
    };
  }

  /**
   * @alias module:panels/root/storage_media_item
   * @class MediaStorageItem
   * @param {Object} elements
                     elements displaying the media storage information
   * @returns {MediaStorageItem}
   */
  function MediaStorageItem(elements) {
    this._enabled = false;
    this._elements = elements;
    this._defaultMediaVolume = DefaultMediaVolume.currentVolume;
    this._boundDefaultMediaVolumeAvailableStateChangeHandler = 
      this._updateMediaStorageInfo.bind(this);
    this._boundDefaultMediaVolumeAvailableFreeSpaceChangeHandler =
      this._updateMediaStorageInfo.bind(this);
    this._boundDefaultMediaVolumeChangeHandler =
      this._defaultMediaVolumeChangeHandler.bind(this);
  }

  MediaStorageItem.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the root panel context.
     *
     * @access public
     * @memberOf MediaStorageItem.prototype
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
        if (this._defaultMediaVolume) {
          this._defaultMediaVolume.observe('availableState',
            this._boundDefaultMediaVolumeAvailableStateChangeHandler);
          this._defaultMediaVolume.observe('volumeFreeSpace',
            this._boundDefaultMediaVolumeAvailableFreeSpaceChangeHandler);
        }
        // Show default media volume state on root panel
        DefaultMediaVolume.observe('currentVolume',
                                   this._boundDefaultMediaVolumeChangeHandler);
        window.addEventListener('localized', this);
        this._updateMediaStorageInfo();
      } else { //unobserve
        if (this._defaultMediaVolume) {
          this._defaultMediaVolume.unobserve('availableState',
            this._boundDefaultMediaVolumeAvailableStateChangeHandler);
          this._defaultMediaVolume.unobserve('volumeFreeSpace',
            this._boundDefaultMediaVolumeAvailableFreeSpaceChangeHandler);
        }
        DefaultMediaVolume.unobserve('currentVolume',
          this._boundDefaultMediaVolumeChangeHandler);
        window.removeEventListener('localized', this);
      }
    },

    handleEvent: function smi_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this._updateMediaStorageInfo();
          break;
      }
    },

    _defaultMediaVolumeChangeHandler:
    function smi_defaultMediaVolumeChangeHandler(defaultMediaVolume) {
      Debug('_defaultMediaVolumeChangeHandler(): defaultMediaVolume = ' +
            JSON.stringify(defaultMediaVolume));
      // save current default media volume
      this._defaultMediaVolume = defaultMediaVolume;
      // update media storage info
      this._updateMediaStorageInfo();
    },

    _updateMediaStorageInfo: function smi_updateMediaStorageInfo() {
      if (!this._defaultMediaVolume) {
        Debug('_updateMediaStorageInfo(): default media volume is not existed');
        this._updateVolumeState(null, 'unavailable');
        return;
      }

      // If the default storage is 'unavailable'. And it's not the
      // internal storage. We show the internal storage status instead.
      if ((this._defaultMediaVolume.availableState === 'unavailable') &&
          (!this._defaultMediaVolume.isExternal)) {
        Debug('_updateMediaStorageInfo(): first volume instead of external');
        var firstVolume = DeviceStorages.getFirstVolume();
        this._updateVolumeState(firstVolume, firstVolume.availableState);
      } else {
        this._updateVolumeState(this._defaultMediaVolume, 
                                this._defaultMediaVolume.availableState);
      }

    },

    _updateVolumeState: function smi_updateVolumeState(volume, state) {
      Debug('_updateVolumeState(): volume = ' + volume + ', state = ' + state);
      // TODO: USBStorageItem._updateUmsDesc()
      switch (state) {
        case 'available':
          this._updateMediaFreeSpace(volume);
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

    _updateMediaFreeSpace: function smi_updateMediaFreeSpace(volume) {
      Debug('_updateMediaFreeSpace(): volume.volumeFreeSpace = ' +
            volume.volumeFreeSpace);
      DeviceStorageHelper.showFormatedSize(this._elements.mediaStorageDesc,
                                           'availableSize',
                                           volume.volumeFreeSpace);
    },

    _lockMediaStorageMenu: function smi_setMediaMenuState(lock) {
      if (lock) {
        this._elements.mediaStorageSection.setAttribute('aria-disabled', true);
      } else {
        this._elements.mediaStorageSection.removeAttribute('aria-disabled');
      }
    }
  };

  return function ctor_media_storage_item(elements) {
    return new MediaStorageItem(elements);
  };
});
