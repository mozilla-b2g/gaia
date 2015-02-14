/**
 * This module is used to show and hide the Addons menu item.
 *
 * Originally this was based on the number of installed addons so that
 * the item was only visible if there were addons to manage. But now
 * the addon panel has a + button for finding and installing new addons
 * so we want it to be visible even when there are no addons.
 *
 * But this is also an experimental feature so we don't want it to be
 * visible to everyone. So for now, we'll make the Addons button visible
 * when the Developer menu is visible and hidden otherwise.
 *
 * If addons become a mainstream feature, then we can just remove
 * this file completely and make the Addons item always visible.
 *
 * @module AddonsItem
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  function AddonsItem(element) {
    this.element = element;
    SettingsListener.observe('developer.menu.enabled', false,
                             this.enabled.bind(this));
  }

  AddonsItem.prototype.enabled = function(enabled) {
    this.element.hidden = !enabled;
  };

  return function(element) {
    return new AddonsItem(element);
  };
});
