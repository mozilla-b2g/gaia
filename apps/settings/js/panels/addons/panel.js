define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AddonManager = require('modules/addon_manager');
  var AddonsList = require('panels/addons/addons_list');

  return function ctor_addons_panel() {
    var addonsList;

    return SettingsPanel({
      onInit: function(panel) {
        var listElement = panel.querySelector('.addon-list');
        var addButton = panel.querySelector('.addons-add');

        addonsList = AddonsList(listElement, AddonManager);
        addButton.addEventListener('click', function() {
          // The addons list panel will update itself if new addon is installed.
          var activity = new window.MozActivity({
            name: 'install',
            data: { type: 'addons' }
          });
          // For workaround jshint.
          activity.onsuccess = function() {};
          // Disable the button for a second so the user can't double click it
          addButton.disabled = true;
          setTimeout(function() {
            addButton.disabled = false;
          }, 1000);
        });
      },

      onBeforeShow: function(panel, options) {
        if (options && options.manifestURL) {
          return addonsList.setFilter(options.manifestURL).then(() =>
            addonsList.enabled = true);
        } else {
          addonsList.enabled = true;
        }
      },

      onBeforeHide: function() {
        return addonsList.unsetFilter().then(() =>
          addonsList.enabled = false);
      }
    });
  };
});
