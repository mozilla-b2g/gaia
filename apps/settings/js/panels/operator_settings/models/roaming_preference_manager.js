/**
 * RoamingPreferenceManager provides functions for setting roaming preference
 * and update the settings fiels accordingly. 
 *
 * @module panels/operator_settings/models/roaming_preference_manager
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');
  var SettingsHelper = require('shared/settings_helper');

  const SETTINGS_KEY = 'ril.roaming.preference';

  /**
   * @class RoamingPreferenceManager
   * @requires module:modules/base/module
   * @requires module:modules/mvvm/observable
   * @requires module:shared/settings_helper
   * @params {MozMobileConnection} conn
   * @returns {RoamingPreferenceManager}
   */
  var RoamingPreferenceManager =
    Module.create(function RoamingPreferenceManager(conn) {
      if (!conn.setRoamingPreference) {
        this.throw(`mobile connection does not support setting roaming
          preference`);
      }
      this.super(Observable).call(this);

      this._conn = conn;
      this._serviceId = [].indexOf.call(navigator.mozMobileConnections, conn);
      var defaultRoamingPreferences =
        [].map.call(navigator.mozMobileConnections, () => { return 'any'; });
      this._settingsHelper =
        SettingsHelper(SETTINGS_KEY, defaultRoamingPreferences);

      this._init(conn);
  }).extend(Observable);

  /**
   * An observable property indicating the current preference.
   *
   * @access public
   * @readonly
   * @memberOf RoamingPreferenceManager.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(RoamingPreferenceManager.prototype,
    'preference', {
      readonly: true,
      value: null
  });

  RoamingPreferenceManager.prototype._init = function(conn) {
    this._conn.getRoamingPreference().then((preference) => {
      this._preference = preference;
    }).catch((error) => {
      this.error('_init: could not retrieve roaming preference type: ' + error);
    });
  };

  /**
   * Set the preference and update the settings field accordingly.
   *
   * @access public
   * @memberOf RoamingPreferenceManager.prototype
   * @params {String} pref
   * @returns {Promise}
   */
  RoamingPreferenceManager.prototype.setRoamingPreference = function(pref) {
    return this._conn.setRoamingPreference(pref).then(() => {
      this._settingsHelper.get((values) => {
        values[this._serviceId] = pref;
        this._settingsHelper.set(values);
      });
      this._preference = pref;
    }, (error) => {
      this.error('setRoamingPreference: ' + error);
    });
  };

  return RoamingPreferenceManager;
});
