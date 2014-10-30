/**
 * PrivacyPanelItem provides the transition to Privacy Panel app.
 *
 * @module PrivacyPanelItem
 */

define(function(require) {
  'use strict';

  function PrivacyPanelItem(element) {
    this.element = element;
    this._ppApp = null;

    this._privacyPanelManifestURL = document.location.protocol +
      '//privacy-panel.gaiamobile.org' +
      (location.port ? (':' + location.port) : '') + '/manifest.webapp';
    
    this._getApp();

    this.element.addEventListener('click', this._launch.bind(this));
  }

  PrivacyPanelItem.prototype = {

    /**
     * Search from privacy-panel app and grab it's instance.
     * @method _getApp
     */
    _getApp: function pp_getApp() {
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var apps = evt.target.result;
        for (var i = 0; i < apps.length && this._ppApp === null; i++) {
          var app = apps[i];
          if (app.manifestURL === this._privacyPanelManifestURL) {
            this._ppApp = app;
            this.element.removeAttribute('hidden');
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
      event.stopImmediatePropagation();
      event.preventDefault();
      
      if (this._ppApp) {
        // Let privacy-panel app know that we launched it from settings
        // so the app can show us a back button pointing to settings app.
        var flag = navigator.mozSettings.createLock().set({
          'pp.launched.by.settings': true
        });
        flag.onsuccess = function() {
          this._ppApp.launch();
        }.bind(this);
        flag.onerror = function(){
          console.error('Problem with launching Privacy Panel');
        };
      } else {
        alert(navigator.mozL10n.get('no-privacypanel'));
      }
    }
  };

  return function ctor_privacyPanelItem(element) {
    return new PrivacyPanelItem(element);
  };
});
