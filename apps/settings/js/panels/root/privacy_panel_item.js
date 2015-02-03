/**
 * PrivacyPanelItem provides the transition to Privacy Panel app.
 *
 * @module PrivacyPanelItem
 */

define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');

  function PrivacyPanelItem(args) {
    this._element = args.element;
    this._link = args.link;
    this._app = null;

    this._privacyPanelManifestURL = document.location.protocol +
      '//privacy-panel.gaiamobile.org' +
      (location.port ? (':' + location.port) : '') + '/manifest.webapp';

    this._getApp();

    this._element.addEventListener('click', this._launch.bind(this));
  }

  PrivacyPanelItem.prototype = {

    /**
     * Set current status of privacyPanelItem
     *
     * @access public
     * @param {Boolean} enabled
     * @memberOf PrivacyPanelItem
     */
    set enabled(enabled) {
      if (this._enabled === enabled) {
        return;
      } else {
        this._enabled = enabled;
        if (this._enabled) {
          this._blurLink();
        }
      }
    },

    /**
     * Get current status of privacyPanelItem
     *
     * @access public
     * @memberOf PrivacyPanelItem
     */
    get enabled() {
      return this._enabled;
    },

    /**
     * Search from privacy-panel app and grab it's instance.
     * @memberOf PrivacyPanelItem
     */
    _getApp: function pp_getApp() {
      return AppsCache.apps().then(function(apps) {
        var i, app;
        for (i = 0; i < apps.length; i++) {
          app = apps[i];
          if (app.manifestURL === this._privacyPanelManifestURL) {
            this._app = app;
            this._element.removeAttribute('hidden');
            return;
          }
        }
      }.bind(this));
    },

    /**
     * Launch Privacy Panel app.
     *
     * @param {Event} event
     * @memberOf PrivacyPanelItem
     */
    _launch: function pp_launch(event) {
      // Stop propagation & prevent default not to block other settings events.
      event.stopImmediatePropagation();
      event.preventDefault();
      
      if (this._app) {
        // Let privacy-panel app know that we launched it from settings
        // so the app can show us a back button pointing to settings app.
        var flag = navigator.mozSettings.createLock().set({
          'privacypanel.launched.by.settings': true
        });
        flag.onsuccess = function() {
          this._app.launch();
        }.bind(this);
        flag.onerror = function() {
          console.error('Problem with launching Privacy Panel');
          alert('Problem with launching Privacy Panel');
        };
      } else {
        alert(navigator.mozL10n.get('no-privacy-panel'));
      }
    },

    /**
     * Blur link.
     *
     * @memberOf PrivacyPanelItem
     */
    _blurLink: function pp_blurLink() {
      this._link.blur();
    }
  };

  return function ctor_privacyPanelItem(element) {
    return new PrivacyPanelItem(element);
  };
});
