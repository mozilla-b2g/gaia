/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ApplicationsList = {
  _apps: [],
  _displayedApp: null,

  _permissions: [
    'power', 'sms', 'contacts', 'telephony', 'mozBluetooth', 'browser',
    'mozApps', 'mobileconnection', 'mozFM', 'systemXHR', 'background',
    'backgroundservice', 'settings', 'alarm', 'camera', 'fmradio', 'voicemail',
    'wifi-manage', 'wifi', 'networkstats-manage', 'geolocation',
    'webapps-manage', 'permissions', 'desktop-notification',
    'device-storage:pictures', 'device-storage:music', 'device-storage:videos',
    'device-storage:apps', 'alarms', 'attention', 'content-camera',
    'tcp-socket', 'bluetooth', 'storage', 'time', 'networkstats-manager',
    'idle', 'network-events', 'embed-apps',
    // Just don't.
    'deprecated-hwvideo'
  ],

  container: document.querySelector('#appPermissions > ul'),
  detailTitle: document.querySelector('#appPermissionsDetails > header > h1'),
  developerName: document.querySelector('#developer-infos > a'),
  developerLink: document.querySelector('#developer-infos > small > a'),
  detailPermissionsList: document.querySelector('#permissionsListHeader + ul'),
  detailPermissionsHeader: document.getElementById('permissionsListHeader'),
  uninstallButton: document.getElementById('uninstall-app'),

  init: function al_init() {
    this.loadApps();

    var appsMgmt = navigator.mozApps.mgmt;
    appsMgmt.oninstall = this.oninstall.bind(this);
    appsMgmt.onuninstall = this.onuninstall.bind(this);

    this.uninstallButton.addEventListener('click', this.uninstall.bind(this));
  },

  loadApps: function al_loadApps() {
    var self = this;

    navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
      var apps = evt.target.result;
      apps.forEach(function(app) {
        if (!self._isManageable(app))
          return;

        self._apps.push(app);
      });

      self._sortApps();
      self.render();
    }
  },

  render: function al_render() {
    this.container.innerHTML = '';

    this._apps.forEach(function appIterator(app) {
      var icon = '';
      if (app.manifest.icons &&
          Object.keys(app.manifest.icons).length) {

        var key = Object.keys(app.manifest.icons)[0];
        var iconURL = app.manifest.icons[key];

        // Adding origin if it's not a data URL
        if (!(iconURL.slice(0, 4) === 'data')) {
          iconURL = app.origin + '/' + iconURL;
        }

        icon = '<img src="' + iconURL + '" />';
      }

      var item = document.createElement('li');
      item.innerHTML = '<a href="#appPermissionsDetails">' +
                       icon + app.manifest.name + '</a>';
      item.onclick = this.showAppDetails.bind(this, app);
      this.container.appendChild(item);
    }, this);
  },

  oninstall: function al_oninstall(evt) {
    var app = evt.application;
    if (!this._isManageable(app))
      return;

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

    if (!app || !this._isManageable(app))
      return;

    window.location.hash = '#appPermissions';

    this._apps.splice(appIndex, 1);

    this.render();
  },

  showAppDetails: function al_showAppDetail(app) {
    this._displayedApp = app;

    var manifest = app.manifest;
    this.detailTitle.textContent = manifest.name;
    this.developerName.textContent = manifest.developer.name;
    this.developerLink.href = manifest.developer.url;
    this.developerLink.textContent = manifest.developer.url;

    this.detailPermissionsList.innerHTML = '';

    var _ = navigator.mozL10n.get;

    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms)
      return;

    // We display permissions declared in the manifest
    // and any other granted permission.
    this._permissions.forEach(function appIterator(perm) {
      var value = mozPerms.get(perm, app.manifestURL, app.origin, false);
      if ((manifest.permissions && perm in manifest.permissions) ||
          value === 'allow') {
        var item = document.createElement('li');
        var content = document.createElement('span');
        content.textContent = _(perm);

        var select = document.createElement('select');
        select.dataset.perm = perm;

        var askOpt = document.createElement('option');
        askOpt.value = 'ask';
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
      }
    }, this);

    this.detailPermissionsHeader.hidden =
      !this.detailPermissionsList.children.length;
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
    var name = this._displayedApp.manifest.name;

    if (confirm(_('uninstallConfirm', {app: name}))) {
      this._displayedApp.uninstall();
      this._displayedApp = null;
    }
  },

  _isManageable: function al_isManageable(app) {
    return (app.removable && app.manifest.launch_path !== undefined);
  },

  _changePermission: function al_removePermission(app, perm, value) {
    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms)
      return;

    mozPerms.set(perm, value, app.manifestURL, app.origin, false);
  },

  _sortApps: function al_sortApps() {
    this._apps.sort(function alphabeticalSort(app, otherApp) {
      return app.manifest.name > otherApp.manifest.name;
    });
  }
};

window.addEventListener('localized', function init(evt) {
  window.removeEventListener('localized', init);

  ApplicationsList.init();
});

