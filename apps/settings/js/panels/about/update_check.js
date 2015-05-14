/* global DeviceStorageHelper */
/**
 * Handle Update check related functionality
 *
 * @module about/UpdateCheck
 */
define(function(require) {
  'use strict';

  var UpdateManager = require('panels/about/update_manager');

  var STATUS_MAP = {
    [UpdateManager.UPDATE_STATUS.CHECKING]: 'checking-for-update',
    [UpdateManager.UPDATE_STATUS.UPDATE_AVAILABLE]: 'update-found',
    [UpdateManager.UPDATE_STATUS.UPDATE_READY]: 'ready-to-update',
    [UpdateManager.UPDATE_STATUS.UPDATE_UNAVAILABLE]: 'no-updates',
    [UpdateManager.UPDATE_STATUS.ALREADY_LATEST_VERSION]:
      'already-latest-version',
    [UpdateManager.UPDATE_STATUS.OFFLINE]: 'retry-when-online',
    [UpdateManager.UPDATE_STATUS.ERROR]: 'check-error',
    [UpdateManager.UPDATE_STATUS.UNKNOWN]: null
  };

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

      UpdateManager.observe('status', this._updateStatus.bind(this));
      UpdateManager.observe('lastUpdateDate',
        this._updateLastUpdateDate.bind(this));

      this._updateStatus(UpdateManager.status);
      this._updateLastUpdateDate(UpdateManager.lastUpdateDate);

      this._elements.checkUpdateNow.addEventListener('click', () => {
        if (!navigator.onLine) {
          alert(this._('no-network-when-update'));
          return;
        }
        UpdateManager.checkForUpdate();
      });
    },

    _updateStatus: function(status) {
      var l10nId = STATUS_MAP[status];
      if (l10nId) {
        this._elements.systemUpdateInfoMenuItem.hidden = false;
        if (status === UpdateManager.UPDATE_STATUS.UPDATE_AVAILABLE) {
          DeviceStorageHelper.showFormatedSize(this._elements.systemUpdateInfo,
            l10nId, UpdateManager.availableUpdate.size);
        } else {
          this._elements.systemUpdateInfo.setAttribute('data-l10n-id', l10nId);
        }
      } else {
        this._elements.systemUpdateInfoMenuItem.hidden = true;
      }
    },

    _updateLastUpdateDate: function(date) {
      // XXX: should change to format value?
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
