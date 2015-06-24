/* global DeviceStorageHelper */
/**
 * Links the root panel list item with Media Storage.
 */
define(function(require) {
  'use strict';

  var DeviceStorageManager = require('modules/storage/device_storage_manager');

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
    this._defaultVolume = DeviceStorageManager.defaultVolume;
    this._boundUpdateMediaStorageInfo = this._updateMediaStorageInfo.bind(this);
    this._boundDefaultVolumeChangeHandler =
      this._defaultVolumeChangeHandler.bind(this);
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
        if (this._defaultVolume) {
          this._defaultVolume.observe('availableState',
            this._boundUpdateMediaStorageInfo);
          this._defaultVolume.observe('volumeFreeSpace',
            this._boundUpdateMediaStorageInfo);
        }
        // Show default media volume state on root panel
        DeviceStorageManager.observe('defaultVolume',
          this._boundDefaultVolumeChangeHandler);
        window.addEventListener('localized', this);
        this._updateMediaStorageInfo();
      } else { //unobserve
        if (this._defaultVolume) {
          this._defaultVolume.unobserve('availableState',
            this._boundUpdateMediaStorageInfo);
          this._defaultVolume.unobserve('volumeFreeSpace',
            this._boundUpdateMediaStorageInfo);
        }
        DeviceStorageManager.unobserve('defaultVolume',
          this._boundDefaultVolumeChangeHandler);
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

    _defaultVolumeChangeHandler:
    function smi_defaultVolumeChangeHandler(defaultVolume) {
      Debug('_defaultVolumeChangeHandler(): defaultVolume = ' +
            JSON.stringify(defaultVolume));
      // save current default media volume
      this._defaultVolume = defaultVolume;
      // update media storage info
      this._updateMediaStorageInfo();
    },

    _updateMediaStorageInfo: function smi_updateMediaStorageInfo() {
      if (!this._defaultVolume) {
        Debug('_updateMediaStorageInfo(): default media volume is not existed');
        this._updateVolumeState(null, 'unavailable');
        return;
      }

      // If the default storage is 'unavailable'. And it's not the
      // internal storage. We show the internal storage status instead.
      if ((this._defaultVolume.availableState === 'unavailable') &&
          (!this._defaultVolume.isExternal)) {
        Debug('_updateMediaStorageInfo(): first volume instead of external');
        var firstVolume = DeviceStorageManager.getFirstVolume();
        this._updateVolumeState(firstVolume, firstVolume.availableState);
      } else {
        this._updateVolumeState(this._defaultVolume, 
                                this._defaultVolume.availableState);
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
