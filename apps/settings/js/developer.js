/* global ScreenLayout, Settings */

'use strict';

var Developer = {
  init: function about_init() {
    document.getElementById('ftuLauncher').onclick = this.launchFTU;

    // hide software home button
    // whenever the device has no hardware home button
    if (!ScreenLayout.getCurrentLayout('hardwareHomeButton')) {
      document.getElementById('software-home-button').style.display = 'none';
      // always set homegesture enabled on tablet, so hide the setting
      if (!ScreenLayout.getCurrentLayout('tiny')) {
        document.getElementById('homegesture').style.display = 'none';
      }
    }

    this._elements = {
      resetButton: document.querySelector('.root-phone'),
    };

    if (navigator.mozPower) {
      this._elements.resetButton.disabled = false;
      this._elements.resetButton.addEventListener('click',
        this._wipeClick.bind(this));
    } else {
      // disable button if mozPower is undefined or can't be used
      this._elements.resetButton.disabled = true;
    }
  },

  launchFTU: function about_launchFTU() {
    var settings = Settings.mozSettings;
    if (!settings) {
      return;
    }

    require(['modules/apps_cache'], function(AppsCache) {
      var key = 'ftu.manifestURL';
      var req = settings.createLock().get(key);
      req.onsuccess = function ftuManifest() {
        var ftuManifestURL = req.result[key];

        // fallback if no settings present
        if (!ftuManifestURL) {
          ftuManifestURL = document.location.protocol +
            '//ftu.gaiamobile.org' +
            (location.port ? (':' + location.port) : '') +
            '/manifest.webapp';
        }

        var ftuApp = null;
        AppsCache.apps().then(function(apps) {
          for (var i = 0; i < apps.length && ftuApp == null; i++) {
            var app = apps[i];
            if (app.manifestURL == ftuManifestURL) {
              ftuApp = app;
            }
          }

          if (ftuApp) {
            ftuApp.launch();
          } else {
            alert(navigator.mozL10n.get('no-ftu'));
          }
        });
      };
    });
  },

  _wipeClick: function about_wipeClick() {
    require(['modules/dialog_service'], (DialogService) => {
      DialogService.confirm('root-warning-body', {
        title: 'root-warning-title',
        submitButtonText: 'reset',
        cancelButtonText: 'cancel'
      }).then((result) => {
        var type = result.type;
        if (type === 'submit') {
          this._wipe();
        }
      });
    });
  },

  _wipe: function about_wipe() {
    var power = navigator.mozPower;
    if (!power) {
      console.error('Cannot get mozPower');
      return;
    }

    if (!power.factoryReset) {
      console.error('Cannot invoke mozPower.factoryReset()');
      return;
    }

    power.factoryReset('root');
  }
};

navigator.mozL10n.once(Developer.init.bind(Developer));
