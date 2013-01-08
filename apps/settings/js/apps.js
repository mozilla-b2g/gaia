/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ApplicationsList = {
  _apps: [],
  _displayedApp: null,

  _permissionsTable: null,

  container: document.querySelector('#appPermissions > ul'),
  detailTitle: document.querySelector('#appPermissions-details > header > h1'),
  developerHeader: document.getElementById('developer-header'),
  developerInfos: document.getElementById('developer-infos'),
  developerName: document.querySelector('#developer-infos > a'),
  developerLink: document.querySelector('#developer-infos > small > a'),
  detailPermissionsList: document.querySelector('#permissionsListHeader + ul'),
  detailPermissionsHeader: document.getElementById('permissionsListHeader'),
  uninstallButton: document.getElementById('uninstall-app'),

  init: function al_init() {
    var appsMgmt = navigator.mozApps.mgmt;
    appsMgmt.oninstall = this.oninstall.bind(this);
    appsMgmt.onuninstall = this.onuninstall.bind(this);

    this.uninstallButton.addEventListener('click', this);
    this.container.addEventListener('click', this);

    // load the permission table
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/resources/permissions_table.json', true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = (function() {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status === 0)) {
        var table = xhr.response;
        this._permissionsTable = table;

        // then load the apps
        this.loadApps();
      }
    }).bind(this);
    xhr.send();
  },

  handleEvent: function al_handleEvent(evt) {
    if (evt.target == this.uninstallButton) {
      this.uninstall();
      return;
    }

    var appIndex = evt.target.dataset.appIndex;
    if (appIndex) {
      this.showAppDetails(this._apps[appIndex]);
      return;
    }
  },

  loadApps: function al_loadApps() {
    var self = this;

    navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
      var apps = evt.target.result;

      apps.forEach(function(app) {
        // Ignore certified apps
        var manifest = app.manifest ? app.manifest : app.updateManifest;
        if (manifest.type == 'certified')
          return;

        self._apps.push(app);
      });

      self._sortApps();
      self.render();
    }
  },

  render: function al_render() {
    this.container.innerHTML = '';

    var listFragment = document.createDocumentFragment();
    this._apps.forEach(function appIterator(app, index) {
      var icon = null;
      var manifest = new ManifestHelper(app.manifest ? app.manifest : app.updateManifest);
      if (manifest.icons &&
          Object.keys(manifest.icons).length) {

        var key = Object.keys(manifest.icons)[0];
        var iconURL = manifest.icons[key];

        // Adding origin if it's not a data URL
        if (!(iconURL.slice(0, 4) === 'data')) {
          iconURL = app.origin + '/' + iconURL;
        }

        icon = document.createElement('img');
        icon.src = iconURL;
      }

      var item = document.createElement('li');

      var link = document.createElement('a');
      link.href = '#appPermissions-details';
      if (icon) {
        link.appendChild(icon);
      }
      var name = document.createTextNode(manifest.name);
      link.appendChild(name);
      link.dataset.appIndex = index;

      item.appendChild(link);

      listFragment.appendChild(item);
    }, this);

    this.container.appendChild(listFragment);
  },

  oninstall: function al_oninstall(evt) {
    var app = evt.application;

    this._apps.push(app);
    this._sortApps();

    this.render();
  },

  onuninstall: function al_onuninstall(evt) {
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

    if (!app)
      return;

    window.location.hash = '#appPermissions';

    this._apps.splice(appIndex, 1);

    this.render();
  },

  showAppDetails: function al_showAppDetail(app) {
    this._displayedApp = app;

    var manifest = new ManifestHelper(app.manifest ? app.manifest : app.updateManifest);
    var developer = manifest.developer;
    this.detailTitle.textContent = manifest.name;

    this.uninstallButton.disabled = !app.removable;

    if (!developer || !('name' in developer)) {
      this.developerInfos.hidden = true;
      this.developerHeader.hidden = true;
    } else {
      this.developerName.textContent = developer.name;
      this.developerInfos.hidden = false;
      this.developerHeader.hidden = false;
      if (!developer.url) {
        delete this.developerName.dataset.href;
        delete this.developerLink.href;
        this.developerLink.hidden = true;
      } else {
        this.developerLink.hidden = false;
        this.developerName.dataset.href = developer.url;
        this.developerLink.href = developer.url;
        this.developerLink.dataset.href = developer.url;
        this.developerLink.textContent = developer.url;
      }
    }
    this.detailPermissionsList.innerHTML = '';

    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms)
      return;

    var table = this._permissionsTable;

    table.plainPermissions.forEach(function appIterator(perm) {
      var value = mozPerms.get(perm, app.manifestURL, app.origin, false);
      if (this._shouldDisplayPerm(app, perm, value)) {
        this._insertPermissionSelect(perm, value);
      }
    }, this);

    table.composedPermissions.forEach(function appIterator(perm) {
      var value = null;
      var display = table.accessModes.some(function modeIterator(mode) {
        var composedPerm = perm + '-' + mode;
        value = mozPerms.get(composedPerm, app.manifestURL, app.origin, false);
        if (this._shouldDisplayPerm(app, composedPerm, value)) {
          return true;
        }
        return false;
      }, this);

      if (display) {
        this._insertPermissionSelect(perm, value);
      }
    }, this);

    this.detailPermissionsHeader.hidden =
      !this.detailPermissionsList.children.length;
  },

  _shouldDisplayPerm: function al_shouldDisplayPerm(app, perm, value) {
    // We display permissions declared in the manifest
    // and any other granted permission.
    var manifest = app.manifest ? app.manifest : app.updateManifest;
    var mozPerms = navigator.mozPermissionSettings;
    var isExplicit = mozPerms.isExplicit(perm, app.manifestURL,
                                         app.origin, false);

    return (isExplicit &&
            ((manifest.permissions && perm in manifest.permissions) ||
              value === 'allow'));
  },

  _insertPermissionSelect: function al_insertPermissionSelect(perm, value) {
    var _ = navigator.mozL10n.get;

    var item = document.createElement('li');
    var content = document.createElement('span');
    content.textContent = _('perm-' + perm.replace(':', '-'));

    var select = document.createElement('select');
    select.dataset.perm = perm;

    var askOpt = document.createElement('option');
    askOpt.value = 'prompt';
    askOpt.text = _('ask');
    select.add(askOpt);

    var denyOpt = document.createElement('option');
    denyOpt.value = 'deny';
    denyOpt.text = _('deny');
    select.add(denyOpt);

    var allowOpt = document.createElement('option');
    allowOpt.value = 'allow';
    allowOpt.text = _('allow');
    select.add(allowOpt);

    select.value = value;
    select.setAttribute('value', value);
    select.onchange = this.selectValueChanged.bind(this);

    item.onclick = function focusSelect() {
      select.focus();
    };

    content.appendChild(select);
    item.appendChild(content);
    this.detailPermissionsList.appendChild(item);
  },

  selectValueChanged: function al_selectValueChanged(evt) {
    if (!this._displayedApp)
      return;

    var select = evt.target;
    select.setAttribute('value', select.value);
    this._changePermission(this._displayedApp,
                           select.dataset.perm, select.value);
  },

  uninstall: function al_uninstall() {
    if (!this._displayedApp)
      return;

    var _ = navigator.mozL10n.get;
    var name = new ManifestHelper(this._displayedApp.manifest).name;

    if (confirm(_('uninstallConfirm', {app: name}))) {
      this._displayedApp.uninstall();
      this._displayedApp = null;
    }
  },

  _changePermission: function al_removePermission(app, perm, value) {
    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms)
      return;

    var table = this._permissionsTable;

    // We edit the composed permission for all the access modes
    if (table.composedPermissions.indexOf(perm) !== -1) {
      table.accessModes.forEach(function modeIterator(mode) {
        var composedPerm = perm + '-' + mode;
        try {
          mozPerms.set(composedPerm, value, app.manifestURL, app.origin, false);
        } catch (e) {
          console.warn('Failed to set the ' + composedPerm + 'permission.');
        }
      }, this);

      return;
    }

    try {
      mozPerms.set(perm, value, app.manifestURL, app.origin, false);
    } catch (e) {
      console.warn('Failed to set the ' + perm + 'permission.');
    }
  },

  _sortApps: function al_sortApps() {
    this._apps.sort(function alphabeticalSort(app, otherApp) {
      var manifest = new ManifestHelper(app.manifest ?
        app.manifest : app.updateManifest);
      var otherManifest = new ManifestHelper(otherApp.manifest ?
        otherApp.manifest : otherApp.updateManifest);
      return manifest.name > otherManifest.name;
    });
  }
};

onLocalized(ApplicationsList.init.bind(ApplicationsList));

