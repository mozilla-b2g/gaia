/**
 * PrivacyPanelItem provides the transition to Privacy Panel app.
 *
 * @module PrivacyPanelItem
 */

define(function(require) {
  'use strict';

  function PrivacyPanelItem(element) {
    this._element = element;
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
          this._updateSelection();
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
     * @method _getApp
     */
    _getApp: function pp_getApp() {
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var apps = evt.target.result;
        for (var i = 0; i < apps.length; i++) {
          var app = apps[i];
          if (app.manifestURL === this._privacyPanelManifestURL) {
            this._app = app;
            this._element.removeAttribute('hidden');
            return;
          }
        }
      }.bind(this);
    },

    /**
     * Launch Privacy Panel app.
     *
     * @param event
     * @method _launch
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
        flag.onerror = function(){
          console.error('Problem with launching Privacy Panel');
        };
      } else {
        alert(navigator.mozL10n.get('no-privacy-panel'));
      }
    },

    /**
     * Update theme section visibility based on _themeCount
     *
     * @memberOf PrivacyPanelItem
     */
    _updateSelection: function() {
      this._element.querySelector('a').blur();
    }
  };

  return function ctor_privacyPanelItem(element) {
    return new PrivacyPanelItem(element);
  };
});
