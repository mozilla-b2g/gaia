/* globals LazyLoader, PasscodeHelper */
'use strict';
(function(exports) {

  /**
   * SettingsMigrator is used to set default value if the new property is
   * not defined in system.
   *
   * @class SettingsMigrator
   */
  var SettingsMigrator = function SettingsMigrator() {
    this._oldPasscode = 'lockscreen.passcode-lock.code';
    this._hashedPasscode = 'lockscreen.passcode-lock.digest.value';
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
     * @param  {Object} result all settings keys
     */
    keyMigration: function km_keyMigration(result) {
      if ((result[this._oldPasscode] !== undefined) &&
          (result[this._hashedPasscode] === undefined)) {
        LazyLoader.load(['/shared/js/passcode_helper.js']).then(() => {
          var set = {};
          var passcode = result[this._oldPasscode];
          set[this._oldPasscode] = '0000'; // this is a pre-defined default
          PasscodeHelper.set(passcode).then(() => {
            window.navigator.mozSettings.createLock().set(set);
          });
        });
      }
    }
  };

  exports.SettingsMigrator = SettingsMigrator;

}(window));
