/* global openIncompatibleSettingsDialog */
/**
 * Links the root panel list item with USB Storage.
 */
define(function(require) {
  'use strict';

  var DeviceStorages = require('modules/storage/device_storages');
  var SettingsListener = require('shared/settings_listener');
  var AsyncStorage = require('shared/async_storage');
  var SettingsCache = require('modules/settings_cache');
  var SettingsService = require('modules/settings_service');

  /**
   * @alias module:panels/root/storage_usb_item
   * @class USBStorageItem
   * @param {Object} elements
                     elements displaying the usb storage information
   * @returns {USBStorageItem}
   */
  function USBStorageItem(elements) {
    this._enabled = false;
    this._elements = elements;
    this._umsSettingKey = 'ums.enabled';
    this._boundUmsSettingHandler = this._umsSettingHandler.bind(this);
    this._boundFirstVolumeAvailableStateChangeHandler =
      this._updateUmsDesc.bind(this);
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
        // ums master switch on root panel
        this._elements.usbEnabledCheckBox.disabled = false;
        this._elements.usbEnabledCheckBox.addEventListener('change', this);
        SettingsListener.observe(this._umsSettingKey, false,
          this._boundUmsSettingHandler);
        // register USB storage split click handler
        this._elements.usbStorage.addEventListener('click', this._onItemClick);
        // observe first volume available state
        DeviceStorages.getFirstVolume().observe('availableState',
          this._boundFirstVolumeAvailableStateChangeHandler);
      } else { //unobserve
        this._elements.usbEnabledCheckBox.removeEventListener('change', this);
        SettingsListener.unobserve(this._umsSettingKey,
          this._boundUmsSettingHandler);
        // unregister USB storage split click handler
        this._elements.usbStorage.removeEventListener('click',
          this._onItemClick);
        // observe first volume available state
        DeviceStorages.getFirstVolume().unobserve('availableState',
          this._boundFirstVolumeAvailableStateChangeHandler);
      }
    },

    _umsSettingHandler: function sui_umsSettingHandler(enabled) {
      this._elements.usbEnabledCheckBox.checked = enabled;
      this._updateUmsDesc();
    },

    // navigate to USB Storage panel
    _onItemClick: function sui_onItemClick(evt) {
      SettingsService.navigate('usbStorage');
    },

    handleEvent: function sui_handleEvent(evt) {
      switch (evt.type) {
        case 'change':
          if (evt.target === this._elements.usbEnabledCheckBox) {
            this._umsMasterSettingChanged(evt);
          }
          break;
      }
    },

    // ums description
    _updateUmsDesc: function sui_updateUmsDesc() {
      var key;
      if (this._elements.usbEnabledCheckBox.checked) {
        //TODO list all enabled volume name
        key = 'enabled';
      } else if (DeviceStorages.getFirstVolume().availableState === 'shared') {
        key = 'umsUnplugToDisable';
      } else {
        key = 'disabled';
      }
      this._elements.usbEnabledInfoBlock.setAttribute('data-l10n-id', key);
    },

    _umsMasterSettingChanged: function sui_umsMasterSettingChanged(evt) {
      var checkbox = evt.target;
      var cset = {};
      var warningKey = 'ums-turn-on-warning';

      if (checkbox.checked) {
        AsyncStorage.getItem(warningKey, (showed) => {
          if (!showed) {
            this._elements.umsWarningDialog.hidden = false;

            this._elements.umsConfirmButton.onclick = () => {
              AsyncStorage.setItem(warningKey, true);
              this._elements.umsWarningDialog.hidden = true;

              SettingsCache.getSettings(
                this._openIncompatibleSettingsDialogIfNeeded.bind(this));
            };

            this._elements.umsCancelButton.onclick = () => {
              cset[this._umsSettingKey] = false;
              Settings.mozSettings.createLock().set(cset);

              checkbox.checked = false;
              this._elements.umsWarningDialog.hidden = true;
            };
          } else {
            SettingsCache.getSettings(
              this._openIncompatibleSettingsDialogIfNeeded.bind(this));
          }
        });
      } else {
        cset[this._umsSettingKey] = false;
        Settings.mozSettings.createLock().set(cset);
      }
    },

    _openIncompatibleSettingsDialogIfNeeded:
    function sui_openIncompatibleSettingsDialogIfNeeded(settings) {
      var cset = {};
      var umsSettingKey = this._umsSettingKey;
      var usbTetheringSetting = settings['tethering.usb.enabled'];

      if (!usbTetheringSetting) {
        cset[umsSettingKey] = true;
        Settings.mozSettings.createLock().set(cset);
      } else {
        var oldSetting = 'tethering.usb.enabled';
        openIncompatibleSettingsDialog('incompatible-settings-warning',
          umsSettingKey, oldSetting, null);
      }
    }
  };

  return function ctor_usb_storage_item(elements) {
    return new USBStorageItem(elements);
  };
});
