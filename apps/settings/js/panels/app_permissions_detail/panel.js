define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsPanel = require('modules/settings_panel');
  var PermissionDetail =
    require('panels/app_permissions_detail/app_permissions_detail');

  return function ctor_app_permissions_detail_panel() {
    var elements = {};
    var permissionDetailModule = PermissionDetail();
    var uninstall =
      permissionDetailModule.uninstall.bind(permissionDetailModule);
    var back = permissionDetailModule.back.bind(permissionDetailModule);

    function bindEvents(doms) {
      doms.uninstallButton.addEventListener('click', uninstall);
      doms.panelHeader.addEventListener('action', back);
    }

    function unbindEvents(doms) {
      doms.uninstallButton.removeEventListener('click', uninstall);
      doms.panelHeader.removeEventListener('action', back);
    }

    return SettingsPanel({
      onInit: function(panel, options) {
        this._verbose = null;
        elements = {
          panelHeader: panel.querySelector('gaia-header'),
          uninstallButton: panel.querySelector('.uninstall-app'),
          list: panel.querySelector('.permissionsListHeader + ul'),
          header: panel.querySelector('.permissionsListHeader'),
          developerLink: panel.querySelector('.developer-infos > a'),
          developerName: panel.querySelector('.developer-infos > a > span'),
          developerUrl: panel.querySelector('.developer-infos > a > small'),
          developerInfos: panel.querySelector('.developer-infos'),
          developerHeader: panel.querySelector('.developer-header'),
          detailTitle: panel.querySelector('.detail-title')
        };
        SettingsListener.observe('debug.verbose_app_permissions', false,
          function(enabled) {
            this._verbose = enabled;
          }.bind(this));
        permissionDetailModule.init(elements, options.permissionsTable);
      },

      onBeforeShow: function(panel, options) {
        permissionDetailModule.showAppDetails(options.app, this._verbose);
        bindEvents(elements);
      },

      onBeforeHide: function() {
        unbindEvents(elements);
      }
    });
  };
});
