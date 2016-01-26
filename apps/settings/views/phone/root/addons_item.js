/**
 * This module is used to show/hide addon menuItem based on the number of
 * current installed addons.
 *
 * @module AddonsItem
 */
define(function(require) {
  'use strict';

  var AddonManager = require('modules/addon_manager');

  function AddonsItem(element) {
    this._enabled = false;
    this._element = element;
    this.init();
  }

  AddonsItem.prototype = {
    /**
     * Set current status of addonsItem
     *
     * @access public
     * @param {Boolean} enabled
     * @memberOf AddonsItem
     */
    set enabled(enabled) {
      if (this._enabled === enabled) {
        return;
      } else {
        this._enabled = enabled;
        if (this._enabled) {
          this._updateAddonSectionVisibility();
        }
      }
    },

    /**
     * Get current status of addonsItem
     *
     * @access public
     * @memberOf AddonsItem
     */
    get enabled() {
      return this._enabled;
    },

    /**
     * Initialization
     *
     * @access private
     * @memberOf AddonsItem
     * @return {Promise}
     */
    init: function() {
      var _handleEvent = this._updateAddonSectionVisibility.bind(this);
      AddonManager.addons.observe('insert', _handleEvent);
      AddonManager.addons.observe('remove', _handleEvent);
      AddonManager.addons.observe('reset', _handleEvent);

      this._updateAddonSectionVisibility();
    },

    /**
     * Update addon section visibility based on _addonCount
     *
     * @memberOf AddonsItem
     */
    _updateAddonSectionVisibility: function() {
      this._element.hidden = AddonManager.length === 0;
    }
  };

  return function(element) {
    return new AddonsItem(element);
  };
});
