/**
 * Transparency Control -- Application List panel.
 *
 * @module TcApplicationsPanel
 * @return {Object}
 */
define([
  'panels',
  'app_list',
  'tc/app_details'
],

function(panels, appList, appDetails) {
  'use strict';

  var _appListContainer;

  /**
   * TC-Applications panel
   *
   * @constructor
   */
  function TcApplicationsPanel() {}

  TcApplicationsPanel.prototype = {

    /**
     * Initialize the Applications panel and its subpanel
     *
     * @method init
     * @param {Object} permissionTable  List of supported permissions.
     */
    init: function init(permissionTable) {
      _appListContainer = document.getElementById('tc-appList');
      var sortKeySelect = document.getElementById('tc-sortKey');

      var refreshAppList = function refreshAppList() {
        this.renderAppList(sortKeySelect.value);
      }.bind(this);
      sortKeySelect.addEventListener('change', refreshAppList);
      window.addEventListener('applicationinstall', refreshAppList);
      window.addEventListener('applicationuninstall', refreshAppList);

      // some apps might have a localized name in their manifest
      window.addEventListener('localized', refreshAppList);

      appList.init(permissionTable).then(this.renderAppList.bind(this),
          error => console.error(error));

      appDetails.init();
    },

    /**
     * Render the Applications panel.
     *
     * @method renderAppList
     * @param {String} sortKey [optional]  Either 'name', 'trust', 'vendor'.
     */
    renderAppList: function renderAppList(sortKey) {
      this._clear();
      if (!sortKey || sortKey === 'name') {
        // apps are already sorted by name, just display them
        this._showAppList(appList.applications);
      }
      else {
        var apps = appList.getSortedApps(sortKey);
        // sorting by headers work because the sort key is either:
        // - a "vendor" name, in which case it makes sense to sort by name
        // - 'certified|privileged|web', which luckily matches the order we want
        Object.keys(apps).sort().forEach(header => {
          var l10nPrefix = (sortKey === 'trust') ? 'tc-trust-' : '';
          this._showAppSeparator(header, l10nPrefix);
          this._showAppList(apps[header], header);
        });
      }
    },

    _clear: function _clear() {
      _appListContainer.innerHTML = '';
    },

    _showAppSeparator: function _showAppSeparator(separator, l10nPrefix) {
      if (!separator) {
        return;
      }
      var header = document.createElement('header');
      var title = document.createElement('h2');
      if (l10nPrefix) {
        title.setAttribute('data-l10n-id', l10nPrefix + separator);
      } else { // vendor names don't need any localization
        title.textContent = separator;
      }
      header.appendChild(title);
      _appListContainer.appendChild(header);
    },

    _showAppList: function _showAppList(apps, groupKey) {
      var list = document.createElement('ul');
      if (groupKey) {
        list.dataset.key = groupKey; // Marionette key
      }

      apps.forEach(app => {
        var item = document.createElement('li');
        var link = document.createElement('a');
        var icon = document.createElement('img');
        var name = document.createElement('span');

        icon.src = app.iconURL;
        name.textContent = app.name;
        link.classList.add('menu-item');
        link.appendChild(icon);
        link.appendChild(name);
        link.addEventListener('click', function showAppDetails() {
          panels.show({ id: 'tc-appDetails', options: app });
        });

        item.classList.add('app-element');
        item.dataset.key = app.name; // Marionette hook
        item.appendChild(link);

        list.appendChild(item);
      });

      _appListContainer.appendChild(list);
    }

  };

  return new TcApplicationsPanel();
});
