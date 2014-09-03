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
      // locale.hour12
      if (result[this._kLocaleTime] === undefined) {
        var _ = navigator.mozL10n.get;
        var localeTimeFormat = _('shortTimeFormat');
        var is12hFormat = (localeTimeFormat.indexOf('%I') >= 0);
        var cset = {};
        cset[this._kLocaleTime] = is12hFormat;
        window.navigator.mozSettings.createLock().set(cset);
      }
    }
  };

  exports.SettingsMigrator = SettingsMigrator;

}(window));
