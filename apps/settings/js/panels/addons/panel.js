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
        var moreLink = panel.querySelector('.get-more-addons');

        addonsList = AddonsList(listElement, AddonManager);
        moreLink.addEventListener('click', function() {
          moreLink.blur();
          // The addons list panel will update itself if new addon is installed.
          var activity = new window.MozActivity({
            name: 'marketplace-category',
            data: { slug: 'addons' }
          });
          // For workaround jshint.
          activity.onsuccess = function() {};
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
