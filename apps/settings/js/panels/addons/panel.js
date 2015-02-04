define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AddonsManager = require('panels/addons/addons_manager');
  var AddonsList = require('panels/addons/addons_list');

  return function ctor_addons_panel() {
    var addonsManager = AddonsManager();
    var addonsList;

    return SettingsPanel({
      onInit: function(panel) {
        var elements = {
          list: panel.querySelector('.addon-list')
        };
        return addonsManager.init().then( () => {
          addonsList = new AddonsList(elements.list, addonsManager);  
        });
      },

      onBeforeShow: function() {
        addonsList.enabled = true;
        addonsManager.enabled = true;
      },

      onBeforeHide: function() {
        addonsList.enabled = false;
        addonsManager.enabled = false;
      }
    });
  };
});
