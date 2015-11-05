/**
 * Handle home screens list panel functionality.
 */
define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');
  var SettingsListener = require('shared/settings_listener');
  var SettingsService = require('modules/settings_service');
  var SettingsCache = require('modules/settings_cache');
  var ManifestHelper = require('shared/manifest_helper');

  var HomescreensList = function ctor_homescreens_list() {
    this._apps = [];
    this._elements = {};
    this.manifestURL = '';
  };

  HomescreensList.prototype = {
    /**
     * initialization.
     *
     * @param {Array.<Object>} elements An array of HTML elements.
     */
    init: function hl_init(elements) {
      this._elements = elements;
      this._renderHomescreens();

      window.addEventListener('applicationinstall',
        this._renderHomescreens.bind(this));
      window.addEventListener('applicationuninstall',
        this._renderHomescreens.bind(this));

      this._elements.moreLink.addEventListener('click',
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
     * handle label click event.
     *
     * @param {Number} index link index.
     * @private
     */
    _labelClick: function hl_labelClick(index) {
      var app = this._apps[index];
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
     * handle radio click event.
     *
     * @param {Number} index link index.
     * @private
     */
    _radioClick: function hl_radioClick(index) {
      var app = this._apps[index];
      const settings = window.navigator.mozSettings;

      // Change the current home screen.
      settings.createLock().set({
        'homescreen.manifestURL': app.manifestURL
      });
    },

    /**
     * Build list item:
     * <li data-app-index="0">
     *   <gaia-radio value="0" name="homescreen">
     *     <label class="name">New Home Screen</label>
     *   </gaia-radio>
     * </li>
     *
     * @param {Object} app   app object.
     * @param {Number} index link index.
     * @private
     */
    _listItemBuilder: function hl_listItemBuilder(app, index) {
      var li = document.createElement('li');
      li.dataset.appIndex = index;

      var radio = document.createElement('gaia-radio');
      radio.className = 'split';
      radio.name = 'homescreen';
      radio.value = index;
      radio.checked = (app.manifestURL === this.manifestURL);

      var manifest =
        new ManifestHelper(app.manifest || app.updateManifest);

      var radioLabel = document.createElement('label');
      radioLabel.classList.add('name');
      radioLabel.textContent = manifest.name;
      radio.appendChild(radioLabel);

      li.appendChild(radio);

      // Keep track if we clicked the label or not.
      // This is needed because you can't stop the event from propagating to the
      // shadow DOM from the label currently.
      var labelClicked = false;

      // Register the handler for the click event on the checkbox.
      radio.addEventListener('click', event => {
        if (!labelClicked) {
          this._radioClick(index);
        }
        labelClicked = false;
        event.stopPropagation();
        event.preventDefault();
      }, true);

      // Register the handler for the mouseup event on the label.
      radioLabel.addEventListener('mouseup', () => {
        labelClicked = true;
        this._labelClick(index);
      });

      return li;
    },

    /**
     * Build the home screens list.
     */
    listBuilder: function hl_listBuilder() {
      this._elements.homescreensList.innerHTML = '';
      var listFragment = document.createDocumentFragment();
      var item;
      this._apps.forEach((app, index) => {
        item = this._listItemBuilder(app, index);
        listFragment.appendChild(item);
      });
      this._elements.homescreensList.appendChild(listFragment);
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
      this._elements.moreLink.blur();
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
