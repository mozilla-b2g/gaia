/**
 * Handle Update check related functionality
 *
 * @module about/UpdateCheck
 */
define(function(require) {
  'use strict';

  /**
   * @alias module:about/UpdateCheck
   * @class UpdateCheck
   * @returns {UpdateCheck}
   */
  var UpdateCheck = function() {
    this._elements = null;
    this._settings = window.navigator.mozSettings;
    this._checkStatus = {
      'gecko.updateStatus': {},
      'apps.updateStatus': {}
    };
    this._ = navigator.mozL10n.get;
  };

  UpdateCheck.prototype = {
    /**
     * initialization.
     *
     * @access public
     * @memberOf UpdateCheck.prototype
     * @param {HTMLElement} elements
     */
    init: function uc_init(elements) {
      this._elements = elements;

      this._loadLastUpdated();

      this._elements.checkUpdateNow.addEventListener('click',
        this._checkForUpdates.bind(this));
    },

    /**
     * Show last update date.
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     */
    _loadLastUpdated: function uc__loadLastUpdated() {
      var key = 'deviceinfo.last_updated';
      var request = this._settings.createLock().get(key);

      request.onsuccess = function() {
        var lastUpdated = request.result[key];
        if (!lastUpdated) {
          return;
        }

        var f = new navigator.mozL10n.DateTimeFormat();
        this._elements.lastUpdateDate.textContent =
          f.localeFormat(new Date(lastUpdated),
            this._('shortDateTimeFormat'));
      }.bind(this);
    },

    /**
     * update result based on return states
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     */
    _statusCompleteUpdater: function uc__statusCompleteUpdater() {
      var hasAllCheckComplete =
        Object.keys(this._checkStatus).every((setting) =>
          this._checkStatus[setting].value === 'check-complete'
        );

      var hasAllResponses =
        Object.keys(this._checkStatus).every((setting) =>
          !!this._checkStatus[setting].value
        );

      if (hasAllCheckComplete) {
        this._elements.updateStatus.classList.remove('visible');
        this._elements.systemStatus.textContent = '';
      }

      if (hasAllResponses) {
        this._elements.updateStatus.classList.remove('checking');
      }
    },

    /**
     * handler for update status.
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     * @param  {String} setting gecko or app setting
     * @param  {Object} event   event contains SettingValue
     */
    _onUpdateStatus: function uc__onUpdateStatus(setting, event) {
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

      this._settings.removeObserver(setting, this._checkStatus[setting].cb);
      this._checkStatus[setting].cb = null;
    },

    /**
     * Check if there's any update.
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     */
    _checkForUpdates: function uc__checkForUpdates() {
      if (!navigator.onLine) {
        alert(this._('no-network-when-update'));
        return;
      }

      this._elements.updateStatus.classList.add('checking', 'visible');

      /* remove whatever was there before */
      this._elements.systemStatus.textContent = '';

      for (var setting in this._checkStatus) {
        this._checkStatus[setting].cb =
          this._onUpdateStatus.bind(this, setting);
        this._settings.addObserver(setting, this._checkStatus[setting].cb);
      }

      this._settings.createLock().set({
        'gaia.system.checkForUpdates': true
      });
    }
  };

  return function ctor_updateCheck() {
    return new UpdateCheck();
  };
});
