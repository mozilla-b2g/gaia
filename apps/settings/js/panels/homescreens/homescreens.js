/**
 * Handle homescreens panel functionality
 */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var ManifestHelper = require('shared/manifest_helper');

  var Homescreens = function() {
    this._settings = navigator.mozSettings;
    this._apps = [];
    this._container = {};
  };

  Homescreens.prototype = {
    /**
     * initialization
     */
    init: function h_init(element) {
      this._container = element;
      this._renderHomescreens();

      window.addEventListener('applicationinstall',
        this._renderHomescreens.bind(this));
      window.addEventListener('applicationuninstall',
        this._renderHomescreens.bind(this));

      this._container.addEventListener('click',
        this._handleListClick.bind(this));
    },

    /**
     * handle list click event
     */
    _handleListClick: function h_handleListClick(evt) {
      var index = evt.target.dataset.appIndex;
      var app = this._apps[index];
      var manifest =
        new ManifestHelper(app.manifest || app.updateManifest);

      SettingsService.navigate('homescreens-details', {
        index: index,
        name: manifest.name,
        description: manifest.description,
        manifestURL: app.manifestURL
      });
    },

    /**
     * Build list item
     * @param  {Object} app   app object
     * @param  {Number} index link index
     */
    _listItemBuilder: function h_listItemBuilder(app, index) {
      var item = document.createElement('li');
      var link = document.createElement('a');

      var manifest =
        new ManifestHelper(app.manifest || app.updateManifest);
      var icon = document.createElement('img');
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

      link.appendChild(icon);
      var name = document.createTextNode(manifest.name);
      link.appendChild(name);
      link.dataset.appIndex = index;
      item.appendChild(link);
      return item;
    },

    /**
     * Build homescreens list
     */
    _listBuilder: function h_listBuilder() {
      this._container.innerHTML = '';
      var listFragment = document.createDocumentFragment();
      var item;
      var self = this;
      this._apps.forEach(function homescreensItr(app, index) {
        item = self._listItemBuilder(app, index);
        listFragment.appendChild(item);
      });
      this._container.appendChild(listFragment);
    },

    _renderHomescreens: function h_renderHomescreens() {
      var self = this;
      navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
        self._apps = evt.target.result.filter(function(app) {
          var manifest =
            new ManifestHelper(app.manifest || app.updateManifest);

          return manifest && manifest.role && manifest.role === 'homescreen';
        });

        self._listBuilder();
      };
    }
  };

  return function ctor_homescreens() {
    return new Homescreens();
  };
});
