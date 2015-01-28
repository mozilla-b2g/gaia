/**
 * App Details panel: list all permissions for the current application.
 *
 * @module TcAppDetailsPanel
 * @return {Object}
 */

define([], function() {
  'use strict';

  var _debug = false; // display the manifest 'permissions' object

  var _panel = null;
  var _explicitPermContainer = null;
  var _implicitPermContainer = null;

  var _currentApp = null;


  /**
   * Helper object for the app_permissions subpanel.
   *
   * @constructor
   */
  function TcAppDetailsPanel() {}

  TcAppDetailsPanel.prototype = {

    /**
     * Initialize the App Permissions panel.
     *
     * @method init
     */
    init: function init(permissionTable) {
      _panel = document.getElementById('tc-appDetails');
      _panel.addEventListener('pagerendered', event =>
          this.renderAppDetails(event.detail));

      _explicitPermContainer = document.getElementById('tc-perm-explicit');
      _implicitPermContainer = document.getElementById('tc-perm-implicit');

      // re-order the permission list
      window.addEventListener('localized', function tcAppPanelLangChange() {
        this.renderPermDetails(_currentApp);
      }.bind(this));

      // in case some explicit permissions have been changed in the Settings app
      window.addEventListener('visibilitychange', function tcAppPanelVis() {
        if (!document.hidden) {
          this.renderAppDetails(_currentApp);
        }
      }.bind(this));
    },

    /**
     * Render the App Permissions panel.
     *
     * @method renderAppDetails
     * @param {DOMApplication} app
     */
    renderAppDetails: function renderAppDetails(app) {
      if (!app) {
        return;
      }

      _currentApp = app; // in case we need to refresh this panel
      _panel.querySelector('h1').textContent = app.name;

      if (_debug) {
        _panel.querySelector('.debug').hidden = false;
        _panel.querySelector('.debug pre').textContent =
          '    origin: ' + app.origin + '\n' +
          JSON.stringify(app.manifest.permissions, null, 4);
      }

      var appInfo = _panel.querySelector('.app-info a');
      appInfo.querySelector('img').src = app.iconURL;
      appInfo.querySelector('span').textContent = app.name;

      var explicit = [];
      var implicit = [];
      app.permissions.forEach(perm => {
        if (perm.explicit) {
          explicit.push(perm);
        } else {
          implicit.push(perm);
        }
      });
      this._showPermissionList(_explicitPermContainer, explicit);
      this._showPermissionList(_implicitPermContainer, implicit);
    },

    _showPermissionList: function _showPermissionList(container, permissions) {
      container.hidden = true;
      if (!permissions.length) {
        return;
      }

      var list = container.querySelector('.permission-list');
      list.innerHTML = '';

      permissions.forEach(perm => {
        var item = document.createElement('li');
        var link = document.createElement('a');
        var name = document.createElement('span');
        name.textContent = perm.name;
        link.appendChild(name);

        // Note: the value is always 'allow' for non-explicit permissions
        if (perm.explicit) {
          var value = document.createElement('span');
          value.setAttribute('data-l10n-id', 'tc-explicit-' + perm.value);
          link.appendChild(value);
        }

        item.classList.add('perm-info');
        item.dataset.key = perm.key; // Marionette hook
        item.appendChild(link);

        if (perm.desc) {
          var desc = document.createElement('p');
          desc.classList.add('description');
          desc.textContent = perm.desc;
          item.appendChild(desc);
        }

        list.appendChild(item);
      });

      container.hidden = false;
    },

  };

  return new TcAppDetailsPanel();
});
