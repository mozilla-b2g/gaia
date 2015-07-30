/**
 * ApnSelections stores the id of the apn being used on each apn type. The
 * selections are provided in terms of Observable. Changes to the selection
 * can be observed and then be saved to the settings database.
 * Implementation details please refer to {@link ApnSelections}.
 *
 * @module modules/apn/apn_selections
 */
define(function(require) {
  'use strict';

  var Observable = require('modules/mvvm/observable');
  var SettingsCache = require('modules/settings_cache');
  var ApnConst = require('modules/apn/apn_const');

  var ICC_COUNT = navigator.mozMobileConnections.length;
  var APN_TYPES = ApnConst.APN_TYPES;
  var APN_SELECTIONS_KEY = ApnConst.APN_SELECTIONS_KEY;

  /**
   * @class ApnSelections
   * @requires module:modules/mvvm/observable
   * @requires module:modules/settings_cache
   * @requires module:modules/apn/apn_const
   * @returns {ApnSelections}
   */
  function ApnSelections() {
    this._readyPromise = null;
    this._apnSelections = [];
  }

  ApnSelections.prototype = {
    /**
     * Converts the apn selections to static objects for storing. 
     *
     * @access private
     * @memberOf ApnSelections.prototype
     * @returns {Promise.<Array>}
     */
    _export: function as__export() {
      return this._apnSelections.map(function(apnSelection) {
        var obj = {};
        APN_TYPES.forEach(function(apnType) {
          obj[apnType] = apnSelection[apnType];
        });
        return obj;
      });
    },

    /**
     * Stores the current selection to the settings database.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     * @returns {Promise}
     */
    _commit: function as__commit() {
      return new Promise(function(resolve) {
        var obj = {};
        obj[APN_SELECTIONS_KEY] = this._export();
        var req = navigator.mozSettings.createLock().set(obj);
        req.onsuccess = function() { resolve(); };
        req.onerror = function() {
          console.error('write apn selections failed');
          resolve();
        };
      }.bind(this));
    },

    /**
     * Registers observers so that we can save the selection when it changes.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     */
    _observeApnSelections: function as__observeApnSelections(apnSelection) {
      APN_TYPES.forEach(function(apnType) {
        apnSelection.observe(apnType, this._commit.bind(this));
      }, this);
    },

    /**
     * Creates empty selections.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     * @returns {Promise}
     */
    _createEmptySelections: function as__createEmptySelections() {
      var emptySelections = [];
      var emptySelection = {};
      APN_TYPES.forEach((apnType) => emptySelection[apnType] = null);

      for (var i = 0; i < ICC_COUNT; i++) {
        emptySelections.push(emptySelection);
      }

      return new Promise(function(resolve, reject) {
        var obj = {};
        obj[APN_SELECTIONS_KEY] = emptySelections;
        var req = navigator.mozSettings.createLock().set(obj);
        req.onsuccess = req.onerror =
          function() { resolve(emptySelections); };
      }.bind(this));
    },

    /**
     * Initializes the selections based on the values stored in the settings
     * database.
     *
     * @access private
     * @memberOf ApnSelections.prototype
     * @returns {Promise}
     */
    _ready: function as__ready() {
        // This ensures that the ready process being executed only once.
      if (!this._readyPromise) {
        var that = this;
        this._readyPromise = new Promise(function(resolve) {
          SettingsCache.getSettings(function(results) {
            resolve(results[APN_SELECTIONS_KEY]);
          });
        }).then(function(apnSelections) {
          if (apnSelections) {
            return apnSelections;
          } else {
            return that._createEmptySelections();
          }
        }).then(function(apnSelections) {
          // Turn the selections to observables
          apnSelections.forEach(function(selection, index) {
            var observableApnSelection = Observable(selection);
            that._observeApnSelections(observableApnSelection);
            that._apnSelections[index] = observableApnSelection;
          });

          // Clear the entire apn selection states when the selections are
          // cleared by other apps (usually the wap push app).
          navigator.mozSettings.addObserver(APN_SELECTIONS_KEY,
            function(event) {
              if (event.settingValue === null) {
                that._readyPromise = null;
              }
          });
        });
      }

      return this._readyPromise;
    },

    /**
     * Returns the apn selection of a sim slot. The selection object is an
     * Observable in which the apn types and apn ids are stored as key-value
     * pairs.
     *
     * @access public
     * @memberOf ApnSelections.prototype
     * @params {Number} serviceId
     * @returns {Promise.<Observable>}
     */
    get: function as_get(serviceId) {
      return this._ready().then(function() {
        return this._apnSelections[serviceId];
      }.bind(this));
    },

    /**
     * Reset the apn selection to null.
     *
     * @access public
     * @memberOf ApnSelections.prototype
     * @params {Number} serviceId
     * @returns {Promise}
     */
    clear: function as_clear(serviceId) {
      var apnSelection = this._apnSelections[serviceId];
      if (!apnSelection) {
        return Promise.resolve();
      }

      return this._ready().then(function() {
        APN_TYPES.forEach(function(apnType) {
          apnSelection[apnType] = null;
        });
      });
    }
  };

  return function() {
    return new ApnSelections();
  };
});
