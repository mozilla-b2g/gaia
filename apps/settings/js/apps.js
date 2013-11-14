/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ApplicationsList = {
  _apps: [],
  _displayedApp: null,

  _permissionsTable: null,

  container: document.querySelector('#appPermissions > div > ul'),
  detailTitle: document.querySelector('#appPermissions-details > header > h1'),
  developerHeader: document.getElementById('developer-header'),
  developerInfos: document.getElementById('developer-infos'),
  developerName: document.querySelector('#developer-infos > a'),
  developerLink: document.querySelector('#developer-infos > small > a'),
  detailPermissionsList: document.querySelector('#permissionsListHeader + ul'),
  detailPermissionsHeader: document.getElementById('permissionsListHeader'),
  uninstallButton: document.getElementById('uninstall-app'),

  bookmarksClear: {
    dialog: document.querySelector('#appPermissions .cb-alert'),
    goButton: document.querySelector('#appPermissions .cb-alert-clear'),
    cancelButton: document.querySelector('#appPermissions .cb-alert-cancel'),
    mainButton: document.getElementById('clear-bookmarks-app')
  },

  init: function al_init() {
    window.addEventListener('applicationinstall', this.oninstall.bind(this));
    window.addEventListener('applicationuninstall',
                            this.onuninstall.bind(this));

    this.uninstallButton.addEventListener('click', this);
    this.container.addEventListener('click', this);

    // load the permission table
    var self = this;
    loadJSON('/resources/permissions_table.json', function loadPermTable(data) {
      self._permissionsTable = data;
      self.initExplicitPermissionsTable();
    });

    // Implement clear bookmarks apps button and its confirm dialog
    var confirmDialog = this.bookmarksClear.dialog;
    this.bookmarksClear.goButton.onclick = function cb_confirmGoClicked(event) {
      var settings = navigator.mozSettings;
      var lock = settings.createLock();
      lock.set({'clear.remote-windows.data': true});

      confirmDialog.hidden = true;
    };

    this.bookmarksClear.cancelButton.onclick =
      function cb_confirmCancelClicked(event) {
        confirmDialog.hidden = true;
      };

    this.bookmarksClear.mainButton.onclick = function clearBookmarksData() {
      confirmDialog.hidden = false;
    };
  },

  initExplicitPermissionsTable: function al_initExplicitPermissionsTable() {
    var self = this;

    var table = this._permissionsTable;
    table.explicitCertifiedPermissions = [];

    var mozPerms = navigator.mozPermissionSettings;

    // we need _any_ certified app in order to build the
    // explicitCertifiedPermissions list so we use the Settings app itself.
    window.navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;

      table.plainPermissions.forEach(function permIterator(perm) {
        var isExplicit = mozPerms.isExplicit(perm, app.manifestURL,
                                             app.origin, false);
        if (isExplicit) {
          table.explicitCertifiedPermissions.push(perm);
        }
      });

      table.composedPermissions.forEach(function permIterator(perm) {
        table.accessModes.some(function modeIterator(mode) {
          var composedPerm = perm + '-' + mode;
          var isExplicit = mozPerms.isExplicit(composedPerm, app.manifestURL,
                                               app.origin, false);
          if (isExplicit) {
            table.explicitCertifiedPermissions.push(composedPerm);
          }
        });
      });

      // then load the apps
      self.loadApps();
    };
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
    var table = this._permissionsTable;
    var mozPerms = navigator.mozPermissionSettings;

    navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
      var apps = evt.target.result;

      apps.forEach(function(app) {
        var manifest = app.manifest ? app.manifest : app.updateManifest;
        if (manifest.type != 'certified') {
          self._apps.push(app);
          return;
        }

        var display = table.explicitCertifiedPermissions.
                            some(function iterator(perm) {
          var permInfo = mozPerms.get(perm, app.manifestURL, app.origin, false);
          return permInfo != 'unknown';
        });

        if (display) {
          self._apps.push(app);
        }
      });

      self._sortApps();
      self.render();
    };
  },

  render: function al_render() {
    this.container.innerHTML = '';

    var listFragment = document.createDocumentFragment();
    this._apps.forEach(function appIterator(app, index) {
      var icon = document.createElement('img');
      var manifest = new ManifestHelper(app.manifest ?
          app.manifest : app.updateManifest);

      icon.src = this._getBestIconURL(app, manifest.icons);

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

    // Unhide clear bookmarks button only after app list is populated
    // otherwise it would appear solely during loading
    this.bookmarksClear.mainButton.style.visibility = '';
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

    Settings.currentPanel = '#appPermissions';

    this._apps.splice(appIndex, 1);

    this.render();
  },

  showAppDetails: function al_showAppDetail(app) {
    this._displayedApp = app;

    var manifest = new ManifestHelper(app.manifest ?
        app.manifest : app.updateManifest);
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
    var mozPerms = navigator.mozPermissionSettings;
    var isExplicit = mozPerms.isExplicit(perm, app.manifestURL,
                                         app.origin, false);

    return (isExplicit && value !== 'unknown');
  },

  _insertPermissionSelect: function al_insertPermissionSelect(perm, value) {
    var _ = navigator.mozL10n.get;

    var item = document.createElement('li');
    var content = document.createElement('p');
    var contentL10nId = 'perm-' + perm.replace(':', '-');
    content.textContent = _(contentL10nId);
    content.dataset.l10nId = contentL10nId;

    var fakeSelect = document.createElement('span');
    fakeSelect.classList.add('button', 'icon', 'icon-dialog');

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
      navigator.mozApps.mgmt.uninstall(this._displayedApp);
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
  },

  _getBestIconURL: function al_getBestIconURL(app, icons) {
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

navigator.mozL10n.ready(ApplicationsList.init.bind(ApplicationsList));

