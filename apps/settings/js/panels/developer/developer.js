/**
 * Handle support panel functionality with SIM and without SIM
 *
 * @module developer/developer
 */
define(function(require) {
  'use strict';

  var DialogService = require('modules/dialog_service');
  var AppsCache = require('modules/apps_cache');
  var ScreenLayout = require('shared/screen_layout');
  var SettingsCache = require('modules/settings_cache');

  const DEVTOOLS_UNRESTRICTED_KEY = 'devtools.unrestricted';

  /**
   * @alias module:developer/developer
   * @class Developer
   * @returns {Developer}
   */
  var Developer = function() {
    this._elements = null;
  };

  Developer.prototype = {
    /**
     * Initialization.
     *
     * @access public
     * @memberOf Developer.prototype
     * @param  {HTMLElement} elements
     */
    init: function d_init(elements) {
      this._elements = elements;

      this._elements.ftuLauncher.addEventListener('click', this._launchFTU);

      // hide software home button whenever the device has no hardware
      // home button
      if (!ScreenLayout.getCurrentLayout('hardwareHomeButton')) {
        this._elements.softwareHomeButton.style.display = 'none';
        // always set homegesture enabled on tablet, so hide the setting
        if (!ScreenLayout.getCurrentLayout('tiny')) {
          this._elements.homegesture.style.display = 'none';
        }
      }

      if (navigator.mozPower) {
        this._elements.resetSwitch.disabled = false;
        this._elements.resetSwitch.addEventListener('click', event => {
          this._resetDevice();
          // The switch is updated based on the setting.
          event.preventDefault();
        });
      } else {
        // disable button if mozPower is undefined or can't be used
        this._elements.resetSwitch.disabled = true;
      }
    },

    /**
     * launch FTU app.
     *
     * @access private
     * @memberOf Developer.prototype
     */
    _launchFTU: function d__launchFTU() {
      var key = 'ftu.manifestURL';
      var req = navigator.mozSettings.createLock().get(key);
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
          for (var i = 0; i < apps.length && ftuApp === null; i++) {
            var app = apps[i];
            if (app.manifestURL === ftuManifestURL) {
              ftuApp = app;
            }
          }

          if (ftuApp) {
            ftuApp.launch();
          } else {
            DialogService.alert('no-ftu', {title: 'no-ftu'});
          }
        });
      };
    },

    /**
     * popup warning dialog.
     *
     * @access private
     * @memberOf Developer.prototype
     */
    _resetDevice: function d__resetDevice() {
      SettingsCache.getSettings(results => {
        var unrestricted = results[DEVTOOLS_UNRESTRICTED_KEY];
        if (unrestricted) {
          DialogService.confirm('reset-devtools-warning-body', {
            title: 'reset-devtools-warning-title',
            submitButton: 'factory-reset',
            cancelButton: 'cancel'
          }).then((result) => {
            var type = result.type;
            if (type === 'submit') {
              this._wipe('normal');
            }
          });
        } else {
          DialogService.show('full-developer-mode-warning').then((result) => {
            if (result.type === 'submit' &&
                result.value === 'final_warning') {
              DialogService.show('full-developer-mode-final-warning');
            }
          });
        }
      });
    },

    /**
     * Reset and enable full DevTools access.
     *
     * @access private
     * @memberOf Developer.prototype
     */
    _wipe: function about__wipe(reason) {
      var power = navigator.mozPower;
      if (!power) {
        console.error('Cannot get mozPower');
        return;
      }
      if (!power.factoryReset) {
        console.error('Cannot invoke mozPower.factoryReset()');
        return;
      }
      power.factoryReset(reason);
    }
  };

  return function ctor_developer_panel() {
    return new Developer();
  };
});
