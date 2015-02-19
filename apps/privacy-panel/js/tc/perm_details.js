/**
 * Permission Details panel: list all applications for the current permission.
 *
 * @module TcPermDetailsPanel
 * @return {Object}
 */
define(['app_list'], function(appList) {
  'use strict';

  var _panel = null;
  var _permInfo = null;
  var _permApps = null;
  var _permGroup = null;

  var _currentPerm = null;

  /**
   * Helper object for the perm_applications subpanel.
   *
   * @constructor
   */
  function TcPermDetailsPanel() {}

  TcPermDetailsPanel.prototype = {

    /**
     * Initialize the Permission Details panel.
     *
     * @method init
     */
    init: function init() {
      _panel = document.getElementById('tc-permDetails');
      _panel.addEventListener('pagerendered',
          event => this.renderPermDetails(event.detail));

      _permInfo = _panel.querySelector('.perm-info');
      _permApps = _panel.querySelector('.app-list');
      _permGroup = _panel.querySelector('.permission-group');

      window.addEventListener('localized', function tcPermDetailsLangChange() {
        this.renderPermDetails(_currentPerm);
      }.bind(this));

      // in case some explicit permissions have been changed in the Settings app
      window.addEventListener('visibilitychange', function tcPermDetailsVis() {
        if (!document.hidden) {
          this.renderPermDetails(_currentPerm);
        }
      }.bind(this));
    },

    /**
     * Render the Permission Details panel.
     *
     * @method renderPermDetails
     * @param {Object} perm
     */
    renderPermDetails: function renderPermDetails(perm) {
      if (!perm) {
        return;
      }

      _currentPerm = perm; // in case we need to refresh this panel
      _panel.querySelector('h1').textContent = perm.name;

      _permInfo.querySelector('span').textContent = perm.name;
      _permInfo.querySelector('p').textContent = perm.desc;

      var apps = appList.getFilteredApps(perm.key);
      _permGroup.hidden = !apps.length;

      _permApps.innerHTML = '';
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

        item.classList.add('app-element');
        item.classList.add('app-info'); // hide the menu arrow
        item.dataset.key = app.name; // Marionette hook
        item.appendChild(link);

        _permApps.appendChild(item);
      });
    }

  };

  return new TcPermDetailsPanel();
});
