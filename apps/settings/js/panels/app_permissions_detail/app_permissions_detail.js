/**
 * Handle app_permissions_detail panel's functionality.
 */

define(function(require) {
  'use strict';

  var ManifestHelper = require('shared/manifest_helper');
  var SettingsService = require('modules/settings_service');
  var mozApps = require('modules/navigator/mozApps');
  var mozPerms = require('modules/navigator/mozPermissionSettings');

  var PermissionsDetail = function pd() {
    this._elements = null;
    this._permissionsTable = null;
    this._app = null;
  };

  PermissionsDetail.prototype = {
    /**
     * initialization
     */
    init: function pd_init(elements, permissionsTable) {
      this._elements = elements;
      this._permissionsTable = permissionsTable;
    },

    /**
     * Back to app_permissions_list panel.
     */
    back: function pd_back() {
      SettingsService.navigate('appPermissions');
    },

    /**
     * Show app detail page.
     */
    showAppDetails: function pd_show_app_details(app) {
      this._app = app;
      var table = this._permissionsTable;
      var elements = this._elements;
      var manifest = new ManifestHelper(app.manifest ?
        app.manifest : app.updateManifest);
      var developer = manifest.developer;
      elements.detailTitle.textContent = manifest.name;
      elements.uninstallButton.disabled = !app.removable;
      if (!developer || !('name' in developer)) {
        elements.developerInfos.hidden = true;
        elements.developerHeader.hidden = true;
      } else {
        elements.developerName.textContent = developer.name;
        elements.developerInfos.hidden = false;
        elements.developerHeader.hidden = false;
        if (!developer.url) {
          delete elements.developerName.dataset.href;
          delete elements.developerLink.href;
          elements.developerLink.hidden = true;
        } else {
          elements.developerLink.hidden = false;
          elements.developerName.dataset.href = developer.url;
          elements.developerLink.href = developer.url;
          elements.developerLink.dataset.href = developer.url;
          elements.developerLink.textContent = developer.url;
        }
      }
      if (!mozPerms) {
        elements.list.hidden = true;
        return;
      } else {
        elements.list.hidden = false;
        elements.list.innerHTML = '';
      }

      table.plainPermissions.forEach(function(perm) {
        var value = mozPerms.get(perm, app.manifestURL,
          app.origin, false);
        if (this._isExplicitPerm(app, perm, value)) {
          this._insertPermissionSelect(perm, value);
        }
      }, this);

      table.composedPermissions.forEach(function appIterator(perm) {
        var value = null;
        var display = table.accessModes.some(function modeIterator(mode) {
          var composedPerm = perm + '-' + mode;
          value = mozPerms.get(composedPerm, app.manifestURL, app.origin,
            false);
          if (this._isExplicitPerm(app, composedPerm, value)) {
            return true;
          }
          return false;
        }, this);

        if (display) {
          this._insertPermissionSelect(perm, value);
        }
      }, this);

      elements.header.hidden = !elements.list.children.length;
    },

    _isExplicitPerm: function pd_shouldDisplayPerm(app, perm, value) {
      var isExplicit = mozPerms.isExplicit(perm, app.manifestURL,
                                           app.origin, false);
      return (isExplicit && value !== 'unknown');
    },

    /**
     * Detect event from user's selection of the permission.
     */
    selectValueChanged: function pd_select_value_changed(evt) {
      var select = evt.target;
      select.setAttribute('value', select.value);
      this._changePermission(select.dataset.perm, select.value);
    },

    /**
     * Change permission of the app.
     */
    _changePermission: function pd__change_permission(perm, value) {
      if (!mozPerms) {
        return;
      }

      var table = this._permissionsTable;
      // We edit the composed permission for all the access modes
      if (table.composedPermissions.indexOf(perm) !== -1) {
        table.accessModes.forEach(function modeIterator(mode) {
          var composedPerm = perm + '-' + mode;

          try {
            mozPerms.set(composedPerm, value, this._app.manifestURL,
              this._app.origin, false);
          } catch (e) {
            console.warn('Failed to set the ' + composedPerm + 'permission.');
          }
        }, this);
        return;
      }

      try {
        mozPerms.set(perm, value, this._app.manifestURL,
          this._app.origin, false);
      } catch (e) {
        console.warn('Failed to set the ' + perm + 'permission.');
      }
    },

    /**
     * Show available selection option of permission in app detail dialog.
     */
    _insertPermissionSelect:
      function pd__insert_permission_select(perm, value) {
        var item = document.createElement('li');
        var content = document.createElement('p');
        var contentL10nId = 'perm-' + perm.replace(':', '-');
        content.setAttribute('data-l10n-id', contentL10nId);

        var fakeSelect = document.createElement('span');
        fakeSelect.classList.add('button', 'icon', 'icon-dialog');

        var select = document.createElement('select');
        select.dataset.perm = perm;

        var askOpt = document.createElement('option');
        askOpt.value = 'prompt';
        askOpt.setAttribute('data-l10n-id', 'ask');
        select.add(askOpt);

        var denyOpt = document.createElement('option');
        denyOpt.value = 'deny';
        denyOpt.setAttribute('data-l10n-id', 'deny');
        select.add(denyOpt);

        var allowOpt = document.createElement('option');
        allowOpt.value = 'allow';
        allowOpt.setAttribute('data-l10n-id', 'allow');
        select.add(allowOpt);

        var opt = select.querySelector('[value="' + value + '"]');
        opt.setAttribute('selected', true);

        select.value = select.options[select.selectedIndex].textContent;
        select.setAttribute('value', value);
        select.onchange = this.selectValueChanged.bind(this);

        item.onclick = function focusSelect() {
          select.focus();
        };

        fakeSelect.appendChild(select);
        item.appendChild(content);
        item.appendChild(fakeSelect);
        this._elements.list.appendChild(item);
    },

    /**
     * Uninstall the choosed app.
     */
    uninstall: function pd_uninstall() {
      mozApps.mgmt.uninstall(this._app).onsuccess = () => {
        this.back();
      };
    }
  };

  return function ctor_app_permissions_detail() {
    return new PermissionsDetail();
  };
});
