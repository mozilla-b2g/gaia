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
    this.element = element;
    this.setElementVisibility();
    AddonManager.addEventListener('addonschanged',
                                  this.setElementVisibility.bind(this));
  }

  AddonsItem.prototype.setElementVisibility = function() {
    var element = this.element;
    AddonManager.getAddons().then(function(addons) {
      element.hidden = (addons.length === 0);
    });
  };

  return function(element) {
    return new AddonsItem(element);
  };
});
