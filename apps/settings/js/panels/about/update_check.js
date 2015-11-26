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

      this._displayNotifyCheckbox();

      this._elements.checkUpdateNow.addEventListener('click',
        this._checkForUpdates.bind(this));
    },

    /**
     * Shows and hides the "notify me" checkbox depending on whether auto
     * updates are enabled.
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     */
    _displayNotifyCheckbox: function uc__displayNotifyCheckBox() {
      var key = 'addons.auto_update';
      var request = this._settings.createLock().get(key);

      request.onsuccess = () => {
        this._elements.addonUpdateNotify
          .classList.toggle('hidden', !request.result[key]);

        this._settings.addObserver(key, e => {
          this._elements.addonUpdateNotify
            .classList.toggle('hidden', !e.settingValue);
        });
      };

      request.onerror = err => {
        console.error('Failed to fetch ', key, err);
      };
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

        this._elements.lastUpdateDate.textContent =
          new Date(lastUpdated).toLocaleString(navigator.languages, {
            hour12: navigator.mozHour12,
            hour: 'numeric',
            minute: 'numeric',
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
          });
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
        Object.keys(this._checkStatus).some((setting) =>
          this._checkStatus[setting].value === 'check-complete'
        );

      var hasAllResponses =
        Object.keys(this._checkStatus).every((setting) =>
          !!this._checkStatus[setting].value
        );

      if (hasAllCheckComplete) {
        this._startClearUpdateStatus();
      }

      // On no-updates we should also remove the checking class.
      var hasNoUpdatesResult =
        Object.keys(this._checkStatus).some((setting) =>
          this._checkStatus[setting].value === 'no-updates'
        );

      if (hasAllResponses || hasNoUpdatesResult) {
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
     * Timer to keep track of displayed update status
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     */
    _clearUpdateStatusTimer: null,

    /**
     * Start timer to hide the update status, ensuring it is displayed
     * for a certain period of time.
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     */
    _startClearUpdateStatus: function uc__clearUpdateStatus() {
      if (this._clearUpdateStatusTimer) {
        clearTimeout(this._clearUpdateStatusTimer);
      }
      this._clearUpdateStatusTimer =
        window.setTimeout(this._doClearUpdateStatus.bind(this), 5000);
    },

    /**
     * Actually hide the update status
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     */
    _doClearUpdateStatus: function uc__clearUpdateStatus() {
      this._elements.updateStatus.classList.remove('visible');
      this._elements.systemStatus.textContent = '';
    },

    /**
     * Check if there's any update.
     *
     * @access private
     * @memberOf UpdateCheck.prototype
     */
    _checkForUpdates: function uc__checkForUpdates() {
      if (!navigator.onLine) {
        this._elements.checkUpdateNow.setAttribute('disabled', 'disabled');
        navigator.mozL10n.formatValue('no-network-when-update').then(msg => {
          alert(msg);
          this._elements.checkUpdateNow.removeAttribute('disabled');
        });
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
