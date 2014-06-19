/**
 * Handle app_permissions_list panel's functionality.
 */

define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var ManifestHelper = require('shared/manifest_helper');
  var SettingsListener = require('shared/settings_listener');
  var mozApps = require('modules/navigator/mozApps');
  var mozPerms = require('modules/navigator/mozPermissionSettings');

  var PermissionsList = function pl() {
    this._elements = null;
    this._permissionsTable = null;
    this._permissionTableHaveProcessed = false;
    this._apps = null;
  };

  PermissionsList.prototype = {
    /**
     * initialization
     */
    init: function pl_init(elements) {
      this._elements = elements;
    },

    /**
     * Set /resources/permissions_table.json.
     */
    setPermissionsTable: function pl_setPermissionsTable(permissionTable) {
      this._permissionTable = permissionTable;
    },

    /**
     * Refresh the app list when we enter into panel.
     */
    refresh: function pl_refresh() {
      this._apps = [];
      if (this._permissionTableHaveProcessed) {
        this.loadApps();
      } else {
        mozApps.getSelf().onsuccess =
          this._initExplicitPermissionsTable.bind(this);
      }
    },

    /**
     * Go to app_permissions_detail panel when user select an app.
     */
    onAppChoose: function pl_on_app_choose(evt) {
      if (evt.target.dataset && evt.target.dataset.appIndex) {
        SettingsService.navigate('appPermissions-details', {
          app: this._apps[evt.target.dataset.appIndex],
          permissionsTable: this._permissionTable
        });
      }
    },

    /**
     * Confirm to clear bookmarks data and close the dialog.
     */
    confirmGoClicked: function pl_confirm_go_clicked() {
      SettingsListener.getSettingsLock().set({
        'clear.remote-windows.data': true
      });
      this._elements.dialog.hidden = true;
    },

    /**
     * Cancel to clear data of bookmarks data and close the dialog.
     */
    confirmCancelClicked: function pl_confirm_cacel_clicked(evt) {
      this._elements.dialog.hidden = true;
    },

    /**
     * Show clear-bookmarks dialog.
     */
    clearBookmarksData: function pl_clear_bookmarks_data(evt) {
      this._elements.dialog.hidden = false;
    },

    /**
     * When new application is installed, we push the app to list, sort them and
     * rerender the app list.
     */
    onApplicationInstall: function pl_on_application_install(evt) {
      var app = evt.application;
      this._apps.push(app);
      this._sortApps();
      this.renderList();
    },

    /**
     * When application is uninstalled, we remove it from list and rerender the
     * app list.
     */
    onApplicationUninstall: function pl_on_application_uninstall(evt) {
      var app;
      var appIndex;
      this._apps.some(function findApp(anApp, index) {
        if (anApp.origin === evt.application.origin) {
          app = anApp;
          appIndex = index;
          return true;
        }
        return false;
      });

      if (!app) {
        return;
      }
      SettingsService.navigate('appPermissions');
      this._apps.splice(appIndex, 1);
      this.renderList();
    },

    /**
     * Sort the applist by the name of its manifest.
     */
    _sortApps: function pl__sort_apps() {
      this._apps.sort(function alphabeticalSort(app, otherApp) {
        var manifest = new ManifestHelper(app.manifest ?
          app.manifest : app.updateManifest);
        var otherManifest = new ManifestHelper(otherApp.manifest ?
          otherApp.manifest : otherApp.updateManifest);
        return manifest.name > otherManifest.name;
      });

    },

    /**
     * Genrate UI template of app item.
     */
    _genAppItemTemplate: function pl__gen_app_item_template(itemData) {
      var icon = document.createElement('img');
      var item = document.createElement('li');
      var link = document.createElement('a');
      var name = document.createTextNode(itemData.name);
      icon.src = itemData.iconSrc;
      link.dataset.appIndex = itemData.index;
      link.appendChild(icon);
      link.appendChild(name);
      item.appendChild(link);
      return item;
    },

    /**
     * Genrate UI template of app item.
     */
    renderList: function pl_render_list() {
      this._elements.list.innerHTML = '';
      var listFragment = document.createDocumentFragment();
      this._apps.forEach(function appIterator(app, index) {
        var manifest = new ManifestHelper(app.manifest ?
            app.manifest : app.updateManifest);
        var li = this._genAppItemTemplate({
          name: manifest.name,
          index: index,
          iconSrc: this._getBestIconURL(app, manifest.icons)
        });
        listFragment.appendChild(li);
      }.bind(this));
      this._elements.list.appendChild(listFragment);
      this._elements.mainButton.hidden = false;
    },

    /**
     * Genrate explicitCertifiedPermissions table from plainPermissions table
     * table and "composedPermissions + accessModes" table.
     */
    _initExplicitPermissionsTable:
      function pl__init_explicit_permissions_tablet(evt) {
        this._currentApp = evt.target.result;

        var table = this._permissionTable;
        table.explicitCertifiedPermissions = [];
        table.plainPermissions.forEach(function plainPermIterator(perm) {
          if (this._isExplicitPerm(perm)) {
            table.explicitCertifiedPermissions.push({
              explicitPermission: perm,
              permission: perm
            });
          }
        }.bind(this));

        table.composedPermissions.forEach(function permIterator(perm) {
          table.accessModes.forEach(function modeIterator(mode) {
            var composedPerm = perm + '-' + mode;
            if (this._isExplicitPerm(composedPerm)) {
              table.explicitCertifiedPermissions.push({
                explicitPermission: composedPerm,
                permission: perm
              });
            }
          }.bind(this));
        }.bind(this));
        this._permissionTableHaveProcessed = true;
        this.loadApps();
    },

    /**
     * Identify the permission whether is explict or not.
     */
    _isExplicitPerm: function pl_is_explicitPerm(perm) {
      return mozPerms.isExplicit(perm, this._currentApp.manifestURL,
                                 this._currentApp.origin, false);
    },

    /**
     * Filter explicit apps from moz apps, sort them, and render to screen.
     */
    loadApps: function pl_load_apps() {
      mozApps.mgmt.getAll().onsuccess = this._loadApps.bind(this);
    },

    _loadApps: function pl__load_apps(evt) {
      var apps = evt.target.result;
      var table = this._permissionTable;
      apps.forEach(function(app) {
        var manifest = app.manifest ? app.manifest : app.updateManifest;
        if (manifest.type != 'certified') {
          this._apps.push(app);
          return;
        }

        var display = table.explicitCertifiedPermissions
                           .some(function iterator(perm) {
          var permInfo = mozPerms.get(perm.explicitPermission,
            app.manifestURL, app.origin, false);
          return permInfo != 'unknown';
        }.bind(this));

        if (display) {
          this._apps.push(app);
        }
      }.bind(this));
      this._sortApps();
      this.renderList();
    },

    /**
     * Get icon URL.
     */
    _getBestIconURL: function pl__get_best_icon_URL(app, icons) {
      if (!icons || !Object.keys(icons).length) {
        return '../style/images/default.png';
      }

      // The preferred size is 30 by the default. If we use HDPI device, we may
      // use the image larger than 30 * 1.5 = 45 pixels.
      var preferredIconSize = 30 * (window.devicePixelRatio || 1);
      var preferredSize = Number.MAX_VALUE;
      var max = 0;

      for (var size in icons) {
        size = parseInt(size, 10);
        if (size > max) {
          max = size;
        }

        if (size >= preferredIconSize && size < preferredSize) {
          preferredSize = size;
        }
      }
      // If there is an icon matching the preferred size, we return the result,
      // if there isn't, we will return the maximum available size.
      if (preferredSize === Number.MAX_VALUE) {
        preferredSize = max;
      }

      var url = icons[preferredSize];

      if (url) {
        return !(/^(http|https|data):/.test(url)) ? app.origin + url : url;
      } else {
        return '../style/images/default.png';
      }
    }
  };
  return function ctor_permissions_list() {
    return new PermissionsList();
  };
});
