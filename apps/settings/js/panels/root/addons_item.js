/**
 * This module is used to show/hide addon menuItem based on the number of
 * current installed addons.
 *
 * @module AddonsItem
 */
define(function(require) {
  'use strict';

  var AddonsManager = require('panels/addons/addons_manager');

  function AddonsItem(element) {
    this._enabled = false;
    this._element = element;
    this.addonsManager = AddonsManager();
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
      this.addonsManager.init().then( () => {
        var _handleEvent = this._updateAddonSectionVisibility.bind(this);
        this.addonsManager.addons.observe('insert', _handleEvent);
        this.addonsManager.addons.observe('remove', _handleEvent);
        this.addonsManager.addons.observe('reset', _handleEvent);

        this._updateAddonSectionVisibility();
      });
    },

    /**
     * Update addon section visibility based on _addonCount
     *
     * @memberOf AddonsItem
     */
    _updateAddonSectionVisibility: function() {
      this._element.hidden = this.addonsManager.length === 0;
    }
  };

  return function(element) {
    return new AddonsItem(element);
  };
});
