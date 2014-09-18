'use strict';
(function(exports) {

  /**
   * SettingsMigrator is used to set default value if the new property is
   * not defined in system.
   *
   * @class SettingsMigrator
   */
  var SettingsMigrator = function SettingsMigrator() {
    this._kLocaleTime = 'locale.hour12';
    this._kDoNotTrackEnabled = 'privacy.donottrackheader.enabled';
    this._kDoNotTrackValue = 'privacy.donottrackheader.value';
  };

  SettingsMigrator.prototype = {
    /**
     * Query all settings key and do the migration
     */
    start: function km_start() {
      var request = window.navigator.mozSettings.createLock().get('*');
      request.onsuccess = function(e) {
        this.keyMigration(request.result);
      }.bind(this);
    },

    /**
     * Place to put key migration code when the new key is used in system.
     * @param  {[type]} result all settings keys
     */
    keyMigration: function km_keyMigration(result) {
      var cset = {};

      // locale.hour12
      if (result[this._kLocaleTime] === undefined) {
        var _ = navigator.mozL10n.get;
        var localeTimeFormat = _('shortTimeFormat');
        var is12hFormat = (localeTimeFormat.indexOf('%I') >= 0);
        cset[this._kLocaleTime] = is12hFormat;
      }

      // do not track
      var preference = result[this._kDoNotTrackValue];
      if (preference !== undefined) {
        // we have to set it back to undefined to make sure 
        // this operation will only be executed once
        cset[this._kDoNotTrackValue] = undefined;
        cset[this._kDoNotTrackEnabled] = (preference === '0');
      }

      window.navigator.mozSettings.createLock().set(cset);
    }
  };

  exports.SettingsMigrator = SettingsMigrator;

}(window));
