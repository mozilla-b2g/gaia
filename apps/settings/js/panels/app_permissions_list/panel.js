/* global loadJSON */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var PermissionList =
    require('panels/app_permissions_list/app_permissions_list');

  return function ctor_app_permissions_list_panel() {
    // We use this flag to identify permissions_table.json has been loaded or
    // not.
    var permissionsTableHasBeenLoaded = false;
    var elements = {};
    var permissionListModule = PermissionList();
    var eventMapping = [
      {
        elementName: 'list',
        eventType: 'click',
        methodName: 'onAppChoose'
      },
      {
        eventType: 'applicationinstall',
        methodName: 'onApplicationInstall'
      },
      {
        eventType: 'applicationuninstall',
        methodName: 'onApplicationUninstall'
      }
    ];

    function bindEvents(elements) {
      eventMapping.forEach(function(map) {
        map.method =
          permissionListModule[map.methodName].bind(permissionListModule);
        if (map.elementName) {
          elements[map.elementName].addEventListener(map.eventType, map.method);
        } else {
          window.addEventListener(map.eventType, map.method);
        }
      });
    }

    function unbindEvents(elements) {
      eventMapping.forEach(function(map) {
        if (!map.method) {
          return;
        }
        if (map.elementName) {
          elements[map.elementName].removeEventListener(map.eventType,
            map.method);
        } else {
          window.removeEventListener(map.eventType, map.method);
        }
      });
    }

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
          loadJSON(['/resources/permissions_table.json'], function(data) {
            permissionsTableHasBeenLoaded = true;
            permissionListModule.setPermissionsTable(data);
            permissionListModule.refresh();
          });
        }
        bindEvents(elements);
      },

      onBeforeHide: function() {
        unbindEvents(elements);
      }
    });
  };
});
