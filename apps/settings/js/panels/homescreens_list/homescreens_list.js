/**
 * Handle home screens list panel functionality.
 */
define(require => {
  'use strict';

  var AppsCache = require('modules/apps_cache');
  var SettingsListener = require('shared/settings_listener');
  var SettingsService = require('modules/settings_service');
  var SettingsCache = require('modules/settings_cache');
  var ManifestHelper = require('shared/manifest_helper');

  var HomescreensList = function ctor_homescreens_list() {
    this._apps = [];
    this.elements = {};
    this.manifestURL = '';
  };

  HomescreensList.prototype = {
    /**
     * initialization.
     *
     * @param {Array.<Object>} elements An array of HTML elements.
     */
    init: function hl_init(elements) {
      this.elements = elements;
      this._renderHomescreens();

      window.addEventListener('applicationinstall',
        this._renderHomescreens.bind(this));
      window.addEventListener('applicationuninstall',
        this._renderHomescreens.bind(this));

      this.elements.homescreensList.addEventListener('click',
        this._handleListClick.bind(this));
      this.elements.moreLink.addEventListener('click',
        this._showMoreHomescreens.bind(this));

      // Refresh the list whenever apps are installed/uninstalled.
      AppsCache.addEventListener('oninstall',
        this._renderHomescreens.bind(this));
      AppsCache.addEventListener('onuninstall',
        this._renderHomescreens.bind(this));

      SettingsListener.observe('homescreen.manifestURL', '', manifestURL => {
        this.manifestURL = manifestURL;
        // There is a race condition, so we need to refresh the list.
        this.listBuilder();
      });
    },

    /**
     * handle list click event
     * @private
     */
    _handleListClick: function hl_handleListClick(evt) {
      var target = evt.target;
      var index = target.dataset.appIndex;

      while (index === undefined) {
        target = target.parentNode;
        index = target.dataset.appIndex;
      }

      var app = this._apps[index];
      const settings = window.navigator.mozSettings;

      if (evt.target.nodeName === 'GAIA-RADIO') {
        // Change the current home screen.
        settings.createLock().set({
          'homescreen.manifestURL': app.manifestURL
        });
        return;
      }

      // Otherwise, open the home screen detail panel.
      var manifest = new ManifestHelper(app.manifest || app.updateManifest);

      SettingsService.navigate('homescreen-details', {
        name: manifest.name,
        author: manifest.developer,
        version: manifest.version,
        description: manifest.description,
        removable: app.removable,
        app: app
      });
    },

    /**
     * Build list item.
     *
     * @param {Object} app   app object.
     * @param {Number} index link index.
     * @private
     */
    _listItemBuilder: function hl_listItemBuilder(app, index) {
      var item = document.createElement('li');
      item.className = 'pack-split';
      item.dataset.appIndex = index;

      var radioLabel = document.createElement('label');
      radioLabel.className = 'pack-radio';
      radioLabel.role = 'presentation';

      var input = document.createElement('gaia-radio');
      input.name = 'homescreen';
      input.value = index;
      input.checked = (app.manifestURL === this.manifestURL);
      radioLabel.appendChild(input);

      item.appendChild(radioLabel);

      var nameLabel = document.createElement('label');
      nameLabel.className = 'name';

      var manifest =
        new ManifestHelper(app.manifest || app.updateManifest);
      /*var icon = document.createElement('img');
      if (manifest.icons && Object.keys(manifest.icons).length) {
        var key = Object.keys(manifest.icons)[0];
        var iconURL = manifest.icons[key];
        if (!(/^(http|https|data):/.test(iconURL))) {
          iconURL = app.origin + '/' + iconURL;
        }
        icon.src = iconURL;
      } else {
        icon.src = '../style/images/default.png';
      }
      nameLabel.appendChild(icon);*/

      var span = document.createElement('span');
      span.textContent = manifest.name;
      nameLabel.appendChild(span);

      item.appendChild(nameLabel);

      return item;
    },

    /**
     * Build the home screens list
     */
    listBuilder: function hl_listBuilder() {
      this.elements.homescreensList.innerHTML = '';
      var listFragment = document.createDocumentFragment();
      var item;
      this._apps.forEach((app, index) => {
        item = this._listItemBuilder(app, index);
        listFragment.appendChild(item);
      });
      this.elements.homescreensList.appendChild(listFragment);
    },

    /**
     * Look for installed home screens and then display that list.
     *
     * @private
     */
    _renderHomescreens: function hl_renderHomescreens() {
      return AppsCache.apps().then(apps => {
        this._apps = apps.filter(app => {
          var manifest =
            new ManifestHelper(app.manifest || app.updateManifest);
          return manifest && manifest.role && manifest.role === 'homescreen';
        });

        this.listBuilder();
      });
    },

    /**
     * Open a web activity to the Marketplace for the available home screens.
     *
     * @private
     */
    _showMoreHomescreens: function hl_showMoreHomescreens() {
      SettingsCache.getSettings(result => {
        var version = result['deviceinfo.os'];
        /* jshint nonew: false */
        new window.MozActivity({
          name: 'marketplace-category',
          data: {
            slug: 'homescreens',
            // Marketplace expects major.minor
            fxos_version: version.split('.').slice(0, 2).join('.')
          }
        });
      });
    }
  };

  return () => new HomescreensList();
});
