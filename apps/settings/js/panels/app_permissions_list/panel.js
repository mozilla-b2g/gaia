define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var PermissionList =
    require('panels/app_permissions_list/app_permissions_list');
  var LazyLoader = require('shared/lazy_loader');

  return function ctor_app_permissions_list_panel() {
    // We use this flag to identify permissions_table.json has been loaded or
    // not.
    var permissionsTableHasBeenLoaded = false;
    var elements = {};
    var permissionListModule = PermissionList();

    return SettingsPanel({
      onInit: function(panel) {
        elements = {
          list: panel.querySelector('.app-list')
        };
        permissionListModule.init(elements.list);
      },

      onBeforeShow: function() {
        if (permissionsTableHasBeenLoaded) {
          permissionListModule.refresh();
        } else {
          LazyLoader.getJSON('/resources/permissions_table.json')
          .then(function(data) {
            permissionsTableHasBeenLoaded = true;
            permissionListModule.setPermissionsTable(data);
            permissionListModule.refresh();
          });
        }
        permissionListModule.enabled = true;
      },

      onBeforeHide: function() {
        permissionListModule.enabled = false;
      }
    });
  };
});
