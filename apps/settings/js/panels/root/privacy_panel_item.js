define(function(require){
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  function PrivacyPanelItem(element) {
    this.element = element;
    this._ppApp = null;

    this._privacyPanelManifestURL = document.location.protocol +
      '//privacy-panel.gaiamobile.org' +
      (location.port ? (':' + location.port) : '') + '/manifest.webapp';
    
    this._getApp();
    this._observeSettings();

    this.element.addEventListener('click', this.launch.bind(this));
  }

  PrivacyPanelItem.prototype = {

    /**
     * Search from privacy-panel app and grab it's instance.
     * 
     * @method _getApp
     */
    _getApp: function() {
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var apps = evt.target.result;
        for (var i = 0; i < apps.length && this._ppApp === null; i++) {
          var app = apps[i];
          if (app.manifestURL === this._privacyPanelManifestURL) {
            this._ppApp = app;
            this.element.removeAttribute('aria-disabled');
          }
        }
      }.bind(this);
    },

    /**
     * Observe devtools changes so we can toggle show/hide Privacy Panel
     * menu item.
     * 
     * @method _observeSettings
     */
    _observeSettings: function() {
      SettingsListener.observe('devtools.ala_dev.enabled', false,
        function(value) {
          if (value) {
            this.element.removeAttribute('hidden')
          } else {
            this.element.setAttribute('hidden', 'hidden');
          }
        }.bind(this)
      );
    },

    /**
     * Launch Privacy Panel app.
     *
     * @method launch
     */
    launch: function(event) {
      event.stopImmediatePropagation();
      event.preventDefault();
      
      if (this._ppApp) {
        // Let privacy-panel app know that we launched it from settings
        // so the app can show us a back button pointing to settings app.
        navigator.mozSettings.createLock().set({
          'pp.launched.by.settings': true
        });
        this._ppApp.launch();
      } else {
        alert(navigator.mozL10n.get('no-privacypanel'));
      }
    }
  };

  return function ctor_privacyPanelItem(element) {
    return new PrivacyPanelItem(element);
  };
});