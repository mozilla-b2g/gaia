/**
 * UI for Addons panel's functionality.
 *
 * @module AddonsList
 */
define(function(require) {
  'use strict';

  var AddonManager = require('modules/addon_manager');
  var ManifestHelper = require('shared/manifest_helper');
  var SettingsService = require('modules/settings_service');
  var AppIconHelper = require('modules/app_icon_helper');

  function AddonsList(panel) {
    this.list = panel.querySelector('.addon-list');
    this.changeHandler = this.handleChange.bind(this);
  }

  AddonsList.prototype.render = function() {
    // Clear out any old list items
    this.list.textContent = '';

    // Now add one list item for each addon
    var self = this;
    AddonManager.getAddons().then(function(addons) {
      addons.forEach(function(addon) {
        self.list.appendChild(self.createAddonListItem(addon));
      });
    });

    // Make sure we update ourselves if the list of addons changes
    AddonManager.addEventListener('addonschanged', this.changeHandler);
  };

  AddonsList.prototype.teardown = function() {
    this.list.textContent = '';
    AddonManager.removeEventListener('addonschanged', this.changeHandler);
  };

  AddonsList.prototype.handleChange = function() {
    // If we are showing when the list of addons changes, then
    // rerender the list right away.
    this.render();
  };

  AddonsList.prototype.createAddonListItem = function(addon) {
    var manifest = new ManifestHelper(addon.manifest || addon.updateManifest);
    var item = document.createElement('li');
    var link = document.createElement('a');
    link.href = '#';
    link.classList.add('menu-item');
    var icon = document.createElement('img');
    icon.src = AppIconHelper.getIconURL(addon, 30 * window.devicePixelRatio);
    var label = document.createElement('label');
    var span = document.createElement('span');
    span.textContent = manifest.name;
    var small = document.createElement('small');
    small.classList.add('menu-item-desc');
    small.setAttribute('data-l10n-id', addon.enabled ? 'enabled' : 'disabled');
    label.appendChild(span);
    label.appendChild(small);
    link.appendChild(icon);
    link.appendChild(label);
    item.appendChild(link);

    item.onclick = function() {
      SettingsService.navigate('addon-details', { addon: addon });
    };

    return item;
  };

  return function ctor_addons_list(panel) {
    return new AddonsList(panel);
  };
});
