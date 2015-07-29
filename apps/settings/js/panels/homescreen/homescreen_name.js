/**
 * HomescreenName module has a `name` property that contains the name of the
 * currently used homescreen and can be watched.
 *
 * @module HomescreenName
 */
define(require => {
  'use strict';

  const MANIFEST_URL_PREF = 'homescreen.manifestURL';

  var SettingsListener = require('shared/settings_listener');
  var AppsCache = require('modules/apps_cache');
  var ManifestHelper = require('shared/manifest_helper');
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  var HomescreenName = Module.create(function HomescreenName() {
    this.super(Observable).call(this);
    this._init();
  }).extend(Observable);

  /**
   * Name of the currently installed homescreen.
   *
   * @memberOf HomescreenName
   * @type {String}
   * @public
   */
  Observable.defineObservableProperty(HomescreenName.prototype, 'name', {
    readonly: true,
    value: ''
  });

  /**
   * Init HomescreenName module.
   *
   * @private
   */
  HomescreenName.prototype._init = function hn_init() {
    //this._name = '';
    this._watchNameChange();
  };

  /**
   * Watch the value of MANIFEST_URL_PREF from settings and update name
   * accordingly.
   *
   * @private
   */
  HomescreenName.prototype._watchNameChange = function hn_watchNameChange() {
    SettingsListener.observe(MANIFEST_URL_PREF, '', manifestURL => {
      this._updateManifestName(manifestURL)
        .then(name => {
          this._name = name;
        })
        .catch(e => {
          console.warn('Could not get manifest name.', e);
        });
    });
  };

  /**
   * Initialise the value of name when the module is instantiated.
   *
   * @public
   */
  HomescreenName.prototype.getName = function hn_getName() {
    const settings = window.navigator.mozSettings;

    var homescreenSetting = settings.createLock().get(MANIFEST_URL_PREF);
    homescreenSetting.onsuccess = () => {
      var manifestURL = homescreenSetting.result[MANIFEST_URL_PREF];
      this._updateManifestName(manifestURL);
    };
  };

  /**
   * Given a manifest URL, returns a promise that resolves to the app name.
   *
   * @param {string} manifestURL
   * @returns {Promise}
   * @private
   */
  HomescreenName.prototype._updateManifestName = function hn_umn(manifestURL) {
    return new Promise((resolve, reject) => {
      AppsCache.apps()
        .then(apps => {
          var manifest = null;
          apps.some(app => {
            if (app.manifestURL === manifestURL) {
              manifest = new ManifestHelper(app.manifest || app.updateManifest);
              return true;
            }
          });

          if (!manifest) {
            return reject(new Error('Manifest URL not found'));
          }

          resolve(manifest.name);
        });
    });
  };

  return HomescreenName;
});
