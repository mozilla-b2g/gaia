/* global SettingsListener */

/**
 * This module display Find My Device's enabled/disabled state on an
 * element.
 *
 * @module panels/root/findmydevice_item
 */
define(function(require) {
  'use strict';

  /**
   * @alias module:panels/root/findmydevice_item
   * @class FindMyDeviceItem
   * @param {HTMLElement} element
                          The element displaying Find My Device's enabled state
   * @returns {FindMyDeviceItem}
   */
  function FindMyDeviceItem(element) {
    this._itemEnabled = false;
    this._FMDEnabled = false;
    this._boundRefreshText = this._refreshText.bind(this, element);
    this._boundFMDEnabledChanged = this._onFMDEnabledChanged.bind(this);
  }

  FindMyDeviceItem.prototype = {
    /**
     * Refresh the text based on Find My Device's enabled state
     *
     * @access private
     * @memberOf FindMyDeviceItem.prototype
     * @param {HTMLElement} element
                            The element showing Find My Device's enabled state
     */
    _refreshText: function fmd_refresh_text(element) {
      if (!navigator.mozL10n) {
        return;
      }

      element.setAttribute('data-l10n-id',
                           this._FMDEnabled ? 'enabled' : 'disabled');
      element.hidden = false;
    },

    /**
     * Listener for changes in Find My Device's enabled state. Updates the
     * text if this item is enabled.
     *
     * @access private
     * @memberOf FindMyDeviceItem.prototype
     * @param {Boolean} value
                        The current enabled state for Find My Device
     */
    _onFMDEnabledChanged: function fmd_enabled_changed(value) {
      this._FMDEnabled = value;
      if (this._itemEnabled) {
        this._boundRefreshText();
      }
    },

    /**
     * The value indicates whether the module is responding.
     *
     * @access public
     * @memberOf FindMyDeviceItem.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._itemEnabled;
    },

    set enabled(value) {
      if (this._itemEnabled === value) {
        return;
      }

      this._itemEnabled = value;
      if (this._itemEnabled) {
        SettingsListener.observe('findmydevice.enabled', false,
          this._boundFMDEnabledChanged);
      } else {
        SettingsListener.unobserve('findmydevice.enabled',
          this._boundFMDEnabledChanged);
      }
    }
  };

  return function ctor_findMyDeviceItem(element) {
    return new FindMyDeviceItem(element);
  };
});
