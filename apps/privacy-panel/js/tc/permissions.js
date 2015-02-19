/**
 * Transparency Control -- Permissions List panel.
 *
 * @module TcPermissionsPanel
 * @return {Object}
 */
define([
  'panels',
  'app_list',
  'tc/perm_details'
],

function(panels, appList, permDetails) {
  'use strict';

  var _permListContainer;

  /**
   * TC-Permissions panel
   *
   * @constructor
   */
  function TcPermissionsPanel() {}

  TcPermissionsPanel.prototype = {

    /**
     * Initialize the Permissions panel and its subpanel
     *
     * @method init
     * @param {Object} permissionTable  List of supported permissions.
     */
    init: function init(permissionTable) {
      _permListContainer = document.getElementById('tc-permList');

      appList.init(permissionTable).then(this.renderPermissionList.bind(this),
          error => console.error(error));

      permDetails.init();

      // in case some explicit permissions have been changed in the Settings app
      window.addEventListener('visibilitychange', function tcPermPanelVis() {
        if (!document.hidden) {
          this.renderPermissionList();
        }
      }.bind(this));

      // when the language is changed, permissions must be re-ordered
      window.addEventListener('localized',
          this.renderPermissionList.bind(this));
    },

    /**
     * Render the Permissions panel.
     *
     * @method renderAppList
     * @param {String} sortKey [optional]  Either 'name', 'trust', 'vendor'.
     */
    renderPermissionList: function renderPermissionList() {
      _permListContainer.innerHTML = '';

      var list = document.createElement('ul');
      appList.permissions.forEach(perm => {
        var item = document.createElement('li');
        var link = document.createElement('a');
        var name = document.createElement('span');

        name.textContent = perm.name;
        link.dataset.key = perm.key; // easy Marionette hook
        link.appendChild(name);
        link.classList.add('menu-item');
        link.classList.add('panel-link');
        link.addEventListener('click', function showAppDetails() {
          panels.show({ id: 'tc-permDetails', options: perm });
        });

        item.appendChild(link);
        list.appendChild(item);
      });

      _permListContainer.appendChild(list);
    }

  };

  return new TcPermissionsPanel();
});
