/**
 * Handle app_permissions_list panel's functionality.
 *
 * @module PermissionsList
 */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var ManifestHelper = require('shared/manifest_helper');
  var AppsCache = require('modules/apps_cache');
  var mozApps = require('modules/navigator/mozApps');
  var mozPerms = require('modules/navigator/mozPermissionSettings');
  var AppIconHelper = require('modules/app_icon_helper');

  var PermissionsList = function pl() {
    this._listRoot = null;
    this._permissionsTable = null;
    this._permissionTableHaveProcessed = false;
    this._apps = null;
    this._enabled = false;
  };

  PermissionsList.prototype = {
    /**
     * initialization
     *
     * @memberOf PermissionsList
     * @param {HTMLElement} listRoot
     * @access public
     */
    init: function pl_init(listRoot) {
      this._listRoot = listRoot;

      this._boundOnAppChoose = this._onAppChoose.bind(this);
      this._boundOnApplicationInstall = this._onApplicationInstall.bind(this);
      this._boundOnApplicationUninstall =
        this._onApplicationUninstall.bind(this);
    },

    set enabled(value) {
      if (value !== this._enabled) {
        this._enabled = value;
        if (this._enabled) {
          this._bindEvents();
        } else {
          this._unbindEvents();
        }
      }
    },

    _bindEvents: function pl__bindEvents() {
      this._listRoot.addEventListener('click', this._boundOnAppChoose);
      AppsCache.addEventListener('oninstall', this._boundOnApplicationInstall);
      AppsCache.addEventListener('onuninstall',
        this._boundOnApplicationUninstall);
    },

    _unbindEvents: function pl__unbindEvents() {
      this._listRoot.removeEventListener('click', this._boundOnAppChoose);
      AppsCache.removeEventListener('oninstall',
        this._boundOnApplicationInstall);
      AppsCache.removeEventListener('onuninstall',
        this._boundOnApplicationUninstall);
    },

    /**
     * Set /resources/permissions_table.json.
     *
     * @memberOf PermissionsList
     * @param {Object} permissionTable
     * @access public
     */
    setPermissionsTable: function pl_setPermissionsTable(permissionTable) {
      this._permissionTable = permissionTable;
    },

    /**
     * Refresh the app list when we enter into panel.
     *
     * @memberOf PermissionsList
     * @access public
     * @return {Promise}
     */
    refresh: function pl_refresh() {
      var self = this;
      this._apps = [];
      if (this._permissionTableHaveProcessed) {
        return this.loadApps();
      } else {
        return mozApps.getSelf().then(function(app) {
          return self._initExplicitPermissionsTable(app);
        }).then(function() {
          return self.loadApps();
        });
      }
    },

    /**
     * Go to app_permissions_detail panel when user select an app.
     *
     * @memberOf PermissionsList
     * @param {Event} evt
     * @access public
     */
    _onAppChoose: function pl__onAppChoose(evt) {
      if (evt.target.dataset && evt.target.dataset.appIndex) {
        SettingsService.navigate('appPermissions-details', {
          app: this._apps[evt.target.dataset.appIndex],
          permissionsTable: this._permissionTable
        });
      }
    },

    /**
     * When new application is installed, we push the app to list, sort them and
     * rerender the app list.
     *
     * @memberOf PermissionsList
     * @param {Event} evt
     * @access public
     */
    _onApplicationInstall: function pl__onApplicationInstall(evt) {
      var app = evt.application;
      this._apps.push(app);
      this._sortApps();
      this.renderList();
    },

    /**
     * When application is uninstalled, we remove it from list and rerender the
     * app list.
     *
     * @memberOf PermissionsList
     * @param {Event} evt
     * @access public
     */
    _onApplicationUninstall: function pl__onApplicationUninstall(evt) {
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
     *
     * @memberOf PermissionsList
     * @access private
     */
    _sortApps: function pl__sortApps() {
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
     *
     * @memberOf PermissionsList
     * @access private
     * @param {Object} itemData
     * @return {HTMLDivElement}
     */
    _genAppItemTemplate: function pl__genAppItemTemplate(itemData) {
      var icon = document.createElement('img');
      var item = document.createElement('li');
      var link = document.createElement('a');
      var span = document.createElement('span');
      span.textContent = itemData.name;
      icon.src = itemData.iconSrc;
      link.dataset.appIndex = itemData.index;
      link.href = '#';
      link.classList.add('menu-item');
      link.appendChild(icon);
      link.appendChild(span);
      item.appendChild(link);
      return item;
    },

    /**
     * Genrate UI template of app item.
     *
     * @memberOf PermissionsList
     * @access public
     */
    renderList: function pl_renderList() {
      this._listRoot.innerHTML = '';
      var listFragment = document.createDocumentFragment();
      this._apps.forEach(function appIterator(app, index) {
        var manifest = new ManifestHelper(app.manifest ?
            app.manifest : app.updateManifest);
        var li = this._genAppItemTemplate({
          name: manifest.displayName,
          index: index,
          iconSrc: AppIconHelper.getIconURL(app, 30 * window.devicePixelRatio)
        });
        listFragment.appendChild(li);
      }.bind(this));
      this._listRoot.appendChild(listFragment);
    },

    /**
     * Genrate explicitCertifiedPermissions table from plainPermissions table
     * table and "composedPermissions + accessModes" table.
     *
     * @memberOf PermissionsList
     * @param {Event} evt
     * @access private
     */
    _initExplicitPermissionsTable:
      function pl__initExplicitPermissionsTable(app) {
        this._currentApp = app;

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
    },

    /**
     * Identify the permission whether is explict or not.
     *
     * @memberOf PermissionsList
     * @access private
     * @return {Bool}
     */
    _isExplicitPerm: function pl_isExplicitPerm(perm) {
      return mozPerms.isExplicit(perm, this._currentApp.manifestURL,
                                 this._currentApp.origin, false);
    },

    /**
     * Filter explicit apps from moz apps, sort them, and render to screen.
     *
     * @memberOf PermissionsList
     * @access public
     * @return {Promise}
     */
    loadApps: function pl_loadApps() {
      var self = this;
      return AppsCache.apps().then(function(apps) {
        self._loadApps(apps);
      });
    },

    /**
     * Iterate internal apps and render them on UI.
     *
     * @memberOf PermissionsList
     * @param {Object[]} apps
     * @access private
     */
    _loadApps: function pl__loadApps(apps) {
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
    }
  };

  return function ctor_permissions_list() {
    return new PermissionsList();
  };
});
