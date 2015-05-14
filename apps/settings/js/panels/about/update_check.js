/**
 * Handle Update check related functionality
 *
 * @module about/UpdateCheck
 */
define(function(require) {
  'use strict';

  var SystemUpdateManager = require('panels/about/system_update_manager');
  var AppUpdateManager = require('panels/about/app_update_manager');

  var STATUS_MAP = {
    [SystemUpdateManager.UPDATE_STATUS.CHECKING]: 'checking-for-update',
    [SystemUpdateManager.UPDATE_STATUS.UPDATE_AVAILABLE]: 'update-found',
    [SystemUpdateManager.UPDATE_STATUS.UPDATE_READY]: 'ready-to-update',
    [SystemUpdateManager.UPDATE_STATUS.UPDATE_UNAVAILABLE]: 'no-updates',
    [SystemUpdateManager.UPDATE_STATUS.ALREADY_LATEST_VERSION]:
      'already-latest-version',
    [SystemUpdateManager.UPDATE_STATUS.OFFLINE]: 'retry-when-online',
    [SystemUpdateManager.UPDATE_STATUS.ERROR]: 'check-error',
    [SystemUpdateManager.UPDATE_STATUS.UNKNOWN]: null
  };

  /**
   * @alias module:about/UpdateCheck
   * @class UpdateCheck
   * @returns {UpdateCheck}
   */
  var UpdateCheck = function() {
    this._elements = null;
    this._settings = window.navigator.mozSettings;
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

      SystemUpdateManager.observe('status', () => {
        this._updateStatus();
      });
      AppUpdateManager.observe('status', () => {
        this._updateStatus();
      });
      SystemUpdateManager.observe('lastUpdateDate', () => {
        this._updateLastUpdateDate();
      });

      this._updateStatus();
      this._updateLastUpdateDate();

      this._elements.checkUpdateNow.addEventListener('click', () => {
        if (!navigator.onLine) {
          alert(this._('no-network-when-update'));
          return;
        }
        SystemUpdateManager.checkForUpdate();
      });
    },

    _updateStatus: function() {
      var systemStatus = SystemUpdateManager.status;
      var appStatus = AppUpdateManager.status;

      var notReady =
        systemStatus === SystemUpdateManager.UPDATE_STATUS.UNKNOWN ||
        appStatus === AppUpdateManager.UPDATE_STATUS.UNKNOWN;
      var checking =
        systemStatus === SystemUpdateManager.UPDATE_STATUS.CHECKING ||
        appStatus === AppUpdateManager.UPDATE_STATUS.CHECKING;
      var updateAvailable =
        systemStatus === SystemUpdateManager.UPDATE_STATUS.UPDATE_AVAILABLE ||
        appStatus === AppUpdateManager.UPDATE_STATUS.UPDATE_AVAILABLE;

      if (notReady) {
        this._elements.systemUpdateInfoMenuItem.hidden = true;
      } else {
        if (checking) {
          this._elements.systemUpdateInfo.setAttribute('data-l10n-id',
            'checking-for-update');
        } else if (updateAvailable) {
          this._elements.systemUpdateInfo.setAttribute('data-l10n-id',
            'update-found');
        } else {
          // It is guaranteed that there is no app update avaialbe when in this
          // case, so we only update the text solely based on system update
          // status.
          this._elements.systemUpdateInfo.setAttribute('data-l10n-id',
            STATUS_MAP[systemStatus]);
        }
        this._elements.systemUpdateInfoMenuItem.hidden = false;
      }
    },

    _updateLastUpdateDate: function() {
      var date = SystemUpdateManager.lastUpdateDate;
      if (date) {
        this._elements.lastUpdateDate.hidden = false;
        var f = new navigator.mozL10n.DateTimeFormat();
        this._elements.lastUpdateDate.textContent =
          f.localeFormat(new Date(date), this._('shortDateTimeFormat'));
      } else {
        this._elements.lastUpdateDate.hidden = true;
      }
    }
  };

  return function ctor_updateCheck() {
    return new UpdateCheck();
  };
});
