/**
 * Homescreen update checking functionality.
 *
 * @module UpdateCheck
 */
define(() => {
  'use strict';

  /**
   * @class UpdateCheck
   * @returns {UpdateCheck}
   */
  var UpdateCheck = function ctor_update_check() {
    this._elements = null;
    this._checkStatus = {
      'gecko.updateStatus': {
        cb: null,
        value: ''
      },
      'apps.updateStatus': {
        cb: null,
        value: ''
      }
    };
    this._ = navigator.mozL10n.get;
  };

  UpdateCheck.prototype = {
    /**
     * initialization.
     *
     * @param {HTMLElement} elements
     * @public
     */
    init: function uc_init(elements) {
      this._elements = elements;
      this._elements.checkUpdateNow.addEventListener('click',
        this._checkForUpdates.bind(this));
    },

    /**
     * update result based on return states
     *
     * @private
     */
    _statusCompleteUpdater: function uc_statusCompleteUpdater() {
      var hasAllCheckComplete =
        Object.keys(this._checkStatus).some(setting =>
          this._checkStatus[setting].value === 'check-complete'
        );

      var hasAllResponses =
        Object.keys(this._checkStatus).every(setting =>
            !!this._checkStatus[setting].value
        );

      if (hasAllCheckComplete) {
        this._elements.updateStatus.classList.remove('visible');
        this._elements.systemStatus.textContent = '';
      }

      // On no-updates we should also remove the checking class.
      var hasNoUpdatesResult =
        Object.keys(this._checkStatus).some(setting =>
          this._checkStatus[setting].value === 'no-updates'
        );

      if (hasAllResponses || hasNoUpdatesResult) {
        this._elements.updateStatus.classList.remove('checking');
      }
    },

    /**
     * handler for update status.
     *
     * @param  {String} setting gecko or app setting
     * @param  {Object} event   event contains SettingValue
     * @private
     */
    _onUpdateStatus: function uc_onUpdateStatus(setting, event) {
      var value = event.settingValue;
      this._checkStatus[setting].value = value;

      /**
       * possible return values:
       *
       * - for system updates:
       *   - no-updates
       *   - already-latest-version
       *   - check-complete
       *   - retry-when-online
       *   - check-error-$nsresult
       *   - check-error-http-$code
       *
       * - for apps updates:
       *   - check-complete
       *
       * use
       * http://mxr.mozilla.org/mozilla-central/ident?i=setUpdateStatus&tree=mozilla-central&filter=&strict=1
       * to check if this is still current
       */

      var l10nValues = [
        'no-updates', 'already-latest-version', 'retry-when-online'];

      if (value !== 'check-complete') {
        var id = l10nValues.indexOf(value) !== -1 ? value : 'check-error';
        this._elements.systemStatus.setAttribute('data-l10n-id', id);
        if (id === 'check-error') {
          console.error('Error checking for system update:', value);
        }
      }

      this._statusCompleteUpdater();

      window.navigator.mozSettings.removeObserver(setting,
        this._checkStatus[setting].cb);
      this._checkStatus[setting].cb = null;
    },

    /**
     * Check if there's any update.
     *
     * @private
     */
    _checkForUpdates: function uc_checkForUpdates() {
      if (!navigator.onLine) {
        alert(this._('no-network-when-update'));
        return;
      }

      this._elements.updateStatus.classList.add('checking', 'visible');

      // Remove whatever was there before.
      this._elements.systemStatus.textContent = '';

      for (var setting in this._checkStatus) {
        this._checkStatus[setting].cb =
          this._onUpdateStatus.bind(this, setting);
        window.navigator.mozSettings.addObserver(setting,
          this._checkStatus[setting].cb);
      }

      window.navigator.mozSettings.createLock().set({
        'gaia.system.checkForUpdates': true
      });
    }
  };

  return () => new UpdateCheck();
});
