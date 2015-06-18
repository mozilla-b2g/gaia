/**
 * ApnSettingsManager provides functions for managing apn items. When an item
 * is selected to be used, ApnSettingsManager also helps convert the selection
 * to the real settings expected by the platform.
 * ApnSettingsManager does its task by coordinating the following objects:
 * - ApnList
 *     There is an ApnList object for each sim. ApnList stores ApnItem objects
 *     representing apns come from the apn.json database, client provisioning
 *     messages, and user's creation. Each ApnItem has an id assigned upon
 *     the creation. The id is used to recored users' apn selection.
 * - ApnSelections
 *     ApnSelections stores the id of the apn being used on each apn
 *     type.
 * - ApnSettings
 *     ApnSettings wraps the apn settings stored in the moz settings database
 *     and provides simple interface for manipulation.
 * Implementation details please refer to {@link ApnSettingsManager}.
 *
 * @module modules/apn/apn_settings_manager
 */
define(function(require) {
  'use strict';

  var AsyncStorage = require('modules/async_storage');
  var ApnConst = require('modules/apn/apn_const');
  var ApnUtils = require('modules/apn/apn_utils');
  var ApnItem = require('modules/apn/apn_item');
  var ApnSettings = require('modules/apn/apn_settings');
  var ApnList = require('modules/apn/apn_list');
  var ApnSelections = require('modules/apn/apn_selections');

  var APN_TYPES = ApnConst.APN_TYPES;
  var APN_LIST_KEY = ApnConst.APN_LIST_KEY;
  var CACHED_ICCIDS_KEY = ApnConst.CACHED_ICCIDS_KEY;

  var RESTORE_MODE = {
    ALL: 0,
    ONLY_APN_ITEMS: 1,
  };

  /**
   * @class ApnSettingsManager
   * @requires module:modules/async_storage
   * @requires module:modules/apn/apn_const
   * @requires module:modules/apn/apn_utils
   * @requires module:modules/apn/apn_item
   * @requires module:modules/apn/apn_settings
   * @requires module:modules/apn/apn_list
   * @requires module:modules/apn/apn_selections
   * @returns {ApnSettingsManager}
   */
  function ApnSettingsManager() {
    this._apnLists = {};
    this._apnSelections = ApnSelections();
    this._apnSettings = ApnSettings();

    this._readyPromises = {};

    Object.defineProperty(this, 'RESTORE_MODE', {
      configurable: false,
      get: function() {
        return RESTORE_MODE;
      }
    });
  }

  ApnSettingsManager.prototype = {
    /**
     * Ensures the current apn items are up-to-date. When the current apn
     * id does not equal to the cached apn id, we should restore the apn items.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @returns {Promise}
     */
    _ready: function asc_fromItems(serviceId) {
      if (!this._readyPromises[serviceId]) {
        // Check if a new icc card is detected.
        this._readyPromises[serviceId] = AsyncStorage.getItem(CACHED_ICCIDS_KEY)
        .then((cachedIccIds) => {
          var cachedIccId = cachedIccIds && cachedIccIds[serviceId];
          var curIccId = navigator.mozMobileConnections[serviceId].iccId;
          if (!curIccId || curIccId === cachedIccId) {
            return;
          }

          cachedIccIds = cachedIccIds || {};
          cachedIccIds[serviceId] = curIccId;
          // Get the default preset apns by restoring.
          return Promise.all([
            // In this case we only restore apn items but not apn settings.
            this.restore(serviceId, RESTORE_MODE.ONLY_APN_ITEMS),
            AsyncStorage.setItem(CACHED_ICCIDS_KEY, cachedIccIds)
          ]);
        });
      }
      return this._readyPromises[serviceId];
    },

    /**
     * Returns the id of the first preset apn item.
     *
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise.<String>}
     */
    _deriveActiveApnIdFromItems: function asc_fromItems(serviceId, apnType) {
      return this._apnItems(serviceId, apnType).then(function(apnItems) {
        if (apnItems.length) {
          return apnItems.sort(ApnUtils.sortByCategory)[0].id;
        } else {
          return null;
        }
      });
    },

    /**
     * Returns the id of the apn item that matches the current apn setting of
     * the specified apn type.
     *
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise.<String>}
     */
    _deriveActiveApnIdFromSettings:
      function asc_deriveFromSettings(serviceId, apnType) {
        return Promise.all([
          this._apnItems(serviceId, apnType),
          this._apnSettings.get(serviceId, apnType)
        ]).then(function(results) {
          var apnItems = results[0];
          var apnInUse = results[1];
          // apnInUse is the apn that RIL is currently using.
          if (apnInUse) {
            var matchedApnItem = apnItems.find(function(apnItem) {
              return ApnUtils.isMatchedApn(apnItem.apn, apnInUse);
            });
            if (matchedApnItem) {
              // Has matched apn in the existing apns.
              return matchedApnItem.id;
            } else {
              var category = (apnInUse.carrier === '_custom_') ?
                ApnItem.APN_CATEGORY.CUSTOM : ApnItem.APN_CATEGORY.PRESET;
              return this.addApn(serviceId, apnInUse, category);
            }
          } else {
            return null;
          }
        }.bind(this));
    },

    /**
     * Return the apn type an apn that is actively being used for.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnId
     *                 id of the apn being checked.
     * @returns {Promise.<String>}
     */
    _getApnAppliedType: function asc_getApnAppliedType(serviceId, apnId) {
      return this._apnSelections.get(serviceId).then(function(apnSelection) {
        return APN_TYPES.find((apnType) => apnSelection[apnType] === apnId);
      }.bind(this));
    },

    /**
     * Store the current apn selection to apn settings to the settings database.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     */
    _storeApnSettingByType: function asc_storeApnByType(serviceId, apnType) {
      return this._apnSelections.get(serviceId).then(function(apnSelection) {
        var apnList = this._apnList(serviceId);
        var apnId = apnSelection[apnType];
        if (apnId) {
          // Get the apn item of apnType.
          return apnList.item(apnId);
        }
      }.bind(this)).then(function(apnItem) {
        if (apnItem) {
          return this._apnSettings.update(serviceId, apnType, apnItem.apn);
        } else {
          return this._apnSettings.update(serviceId, apnType, null);
        }
      }.bind(this));
    },

    /**
     * Get the apn item list of a sim slot.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @returns {ApnList} The apn item list.
     */
    _apnList: function asc_apnList(serviceId) {
      var apnList = this._apnLists[serviceId];
      if (!apnList) {
        this._apnLists[serviceId] = apnList = ApnList(APN_LIST_KEY + serviceId);
      }
      return apnList;
    },

    /**
     * Get the apn items of an apn type for a sim slot.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise.<Array.<ApnItem>>} The apn items.
     */
    _apnItems: function asc_apnItems(serviceId, apnType) {
      return this._ready(serviceId).then(() => {
        return this._apnList(serviceId).items();
      }).then((apnItems) => {
        return apnItems &&
          apnItems.filter(ApnUtils.apnTypeFilter.bind(null, apnType)) || [];
      });
    },

    /**
     * Restore the apn items of a category.
     *
     * @access private
     * @memberOf ApnSettingsManager.prototype
     * @param {ApnList} apnList
     * @param {Array<Object>} apnsForRestoring
     *                        The function use this to restore the apn items.
     * @param {ApnItem.APN_CATEGORY} category
     *                               The category of the items to be resotred.
     * @returns {Promise.<Array.<String>>} The id of the restored apn items.
     */
    _restoreApnItemsOfCategory:
      function asc_restoreApnItems(apnList, apnsForRestoring, category) {
        return apnList.items().then(function(apnItems) {
          // Remove all existing preset apns.
          apnItems = apnItems || [];
          var promises = [];
          apnItems.filter(function(apnItem) {
            if (apnItem.category === category) {
              return true;
            }
          }).forEach(function(apnItem) {
            promises.push(apnList.remove(apnItem.id));
          });

          return Promise.all(promises);
        }).then(function() {
          // Add default preset apns.
          var promises = [];
          apnsForRestoring.forEach(function(apns) {
            promises.push(apnList.add(apns, category));
          });
          return Promise.all(promises);
        });
    },

    /**
     * Restore the apn items and apn settings to the default. Only apn items of
     * the category ApnItem.APN_CATEGORY.PRESET and ApnItem.APN_CATEGORY.EU are
     * restored. User created apn items (custom apns) will not be affected. The
     * preset apn items are from the apn.json database and client provisioning
     * messages.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {String} serviceId
     * @param {Number} mode
     *                 The possible values are defined in RESTORE_MODE. We
     *                 restore both apn items and apn settings by default. Only
     *                 apn items are restored when mode is
     *                 RESTORE_MODE.ONLY_APN_ITEMS.
     * @returns {Promise}
     */
    restore: function asc_restore(serviceId, mode) {
      var mobileConnection = navigator.mozMobileConnections[serviceId];
      var networkType = mobileConnection.data.type;
      var apnList = this._apnList(serviceId);
      var that = this;

      return Promise.all([
        ApnUtils.getOperatorCode(serviceId, 'mcc'),
        ApnUtils.getOperatorCode(serviceId, 'mnc')
      ]).then(function(values) {
        // Get default apns and client provisioning apns matching the mcc/mnc
        // codes.
        var mcc = values[0];
        var mnc = values[1];

        return Promise.all([
          ApnUtils.getEuApns(),
          ApnUtils.getDefaultApns(mcc, mnc, networkType),
          ApnUtils.getCpApns(mcc, mnc, networkType)
        ]);
      }).then(function(results) {
        // Restore preset and eu apns.
        var euApns = ApnUtils.separateApnsByType(results[0]);
        var presetApns = ApnUtils.separateApnsByType(
          Array.prototype.concat.apply([], results.slice(1)));

        return that._restoreApnItemsOfCategory(
          apnList, euApns, ApnItem.APN_CATEGORY.EU)
        .then(function() {
          return that._restoreApnItemsOfCategory(
            apnList, presetApns, ApnItem.APN_CATEGORY.PRESET);
        });
      }).then(function() {
        // We simply clear the apn selections. The selections will be restored
        // based on the current apn settings when it is being queried.
        return that._apnSelections.clear(serviceId);
      }).then(function() {
        if (mode !== RESTORE_MODE.ONLY_APN_ITEMS) {
          return that._apnSettings.restore(serviceId);
        }
      });
    },

    /**
     * Query apn items matching the mcc/mnc codes in the apn.json
     * database and the one received through client provisioning messages.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise.<Array.<ApnItem>>} The apn items
     */
    queryApns: function asc_queryApns(serviceId, apnType) {
      return this.getActiveApnId(serviceId, apnType)
      .then(function(activeApnId) {
        return this._apnItems(serviceId, apnType).then(function(items) {
          items.forEach(function(apnItem) {
            apnItem.active = (apnItem.id === activeApnId);
          });
          return items;
        });
      }.bind(this));
    },

    /**
     * Add an apn to a sim slot.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {Object} apn
     * @param {ApnItem.APN_CATEGORY} category
     * @returns {Promise}
     */
    addApn: function asc_addApn(serviceId, apn, category) {
      return this._ready(serviceId).then(() => {
        return this._apnList(serviceId).add(apn,
          category || ApnItem.APN_CATEGORY.CUSTOM);
      });
    },

    /**
     * Remove an apn from a sim slot.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} id
     *                 id of the apn item to be added.
     * @returns {Promise}
     */
    removeApn: function asc_removeApn(serviceId, id) {
      return this._ready(serviceId).then(() => {
        return this._apnList(serviceId).remove(id);
      }).then(() => {
        // check if the removed apn is actively being used.
        return this._getApnAppliedType(serviceId, id);
      }).then((matchedApnType) => {
        if (matchedApnType) {
          return this._deriveActiveApnIdFromItems(serviceId, matchedApnType)
          .then((activeApnId) => {
            return this.setActiveApnId(serviceId, matchedApnType, activeApnId);
          });
        }
      });
    },

    /**
     * Update an apn item.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} id
     *                 id of the apn item to be updated.
     * @param {Object} apn
     * @returns {Promise}
     */
    updateApn: function asc_updateApn(serviceId, id, apn) {
      return this._ready(serviceId).then(() => {
        return this._apnList(serviceId).update(id, apn);
      }).then(() => {
        // check if the updated apn is actively being used.
        return this._getApnAppliedType(serviceId, id);
      }).then((matchedApnType) => {
        if (matchedApnType) {
          return this._storeApnSettingByType(serviceId, matchedApnType);
        }
      });
    },

    /**
     * Get the id of the apn that is actively being used for an apn type.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     * @returns {Promise.<String>}
     */
    getActiveApnId: function asc_getActiveApnId(serviceId, apnType) {
      var that = this;
      return this._ready(serviceId).then(function() {
        return that._apnSelections.get(serviceId);
      }).then(function(apnSelection) {
        return apnSelection && apnSelection[apnType];
      }).then(function(activeApnId) {
        if (activeApnId) {
          return activeApnId;
        } else {
          // If there is no existing active apn id, try to derive the id from
          // the current apn settings.
          return that._deriveActiveApnIdFromSettings(serviceId, apnType)
          .then(function(apnId) {
            // Set the id as the active apn id.
            that.setActiveApnId(serviceId, apnType, apnId);
            return apnId;
          });
        }
      }).then(function(activeApnId) {
        // If there is still no active apn id, means that the apn settings have
        // not been set and we need to derive a default id from the current apn
        // items (stored in the apn list).
        if (activeApnId) {
          return activeApnId;
        } else {
          return that._deriveActiveApnIdFromItems(serviceId, apnType)
          .then(function(apnId) {
            // Set the id as the active apn id.
            that.setActiveApnId(serviceId, apnType, apnId);
            return apnId;
          });
        }
      });
    },

    /**
     * Set the id of an apn that is to be used for an apn type.
     *
     * @access public
     * @memberOf ApnSettingsManager.prototype
     * @param {Number} serviceId
     * @param {String} apnType
     * @param {String} id
     * @returns {Promise}
     */
    setActiveApnId: function asc_setActiveApnId(serviceId, apnType, id) {
      return this._ready(serviceId).then(() => {
        return this._apnSelections.get(serviceId);
      }).then((apnSelection) => {
        if (apnSelection[apnType] !== id) {
          apnSelection[apnType] = id;
          return this._storeApnSettingByType(serviceId, apnType);
        }
      });
    }
  };

  return new ApnSettingsManager();
});
