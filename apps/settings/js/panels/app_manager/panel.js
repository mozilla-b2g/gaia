define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AppManager = require('panels/app_manager/app_manager');
  var LazyLoader = require('shared/lazy_loader');

  return function ctor_app_manager_panel() {
    // We use this flag to identify permissions_table.json has been loaded or
    // not.
    var permissionsTableHasBeenLoaded = false;
    var elements = {};
    var appManagerModule = AppManager();

    return SettingsPanel({
      onInit: function(panel) {
        elements = {
          list: panel.querySelector('.app-list')
        };
        appManagerModule.init(elements.list);
      },

      onBeforeShow: function() {
        if (permissionsTableHasBeenLoaded) {
          appManagerModule.refresh();
        } else {
          LazyLoader.getJSON('/resources/permissions_table.json')
          .then(function (data) {
            permissionsTableHasBeenLoaded = true;
            appManagerModule.setPermissionsTable(data);
            appManagerModule.refresh();
          });
        }
        appManagerModule.enabled = true;
      },

      onBeforeHide: function() {
        appManagerModule.enabled = false;
      }
    });
  };
});
