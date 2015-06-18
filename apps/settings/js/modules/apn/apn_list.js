/**
 * ApnList stores ApnItem objects representing apns come from the apn.json
 * database, client provisioning messages, and user's creation. Each ApnItem has
 * an id assigned upon the creation. The id is used to recored users' apn
 * selection.
 *
 * @module modules/apn/apn_list
 */
define(function(require) {
  'use strict';

  var AsyncStorage = require('modules/async_storage');
  var ApnUtils = require('modules/apn/apn_utils');
  var ApnItem = require('modules/apn/apn_item');

  /**
   * @class ApnList
   * @requires module:modules/async_storage
   * @requires module:modules/apn/apn_utils
   * @requires module:modules/apn/apn_item
   * @returns {ApnList}
   */
  function ApnList(key) {
    this._key = key;
    this._apnItems = null;
    this._pendingTaskCount = 0;
    this._promiseChain = Promise.resolve();
  }

  ApnList.prototype = {
    /**
     * As the operations should not be performed concurrently. We use this
     * function to enusre the operations are performed one by one.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @param {Function} task
     * @returns {Promise}
     */
    _schedule: function al__schedule(task) {
      var that = this;
      this._promiseChain = this._promiseChain.then(function() {
        that._pendingTaskCount++;
        return task().then(function(result) {
          that._pendingTaskCount--;
          if (that._pendingTaskCount === 0) {
            return that._commit().then(function() {
              return result;
            });
          } else {
            return result;
          }
        });
      });
      return this._promiseChain;
    },

    /**
     * _apnItems are wrapped apn items. The function unwraps the items so
     * that they can be stored to async storage.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @returns {Array}
     */
    _export: function al__export() {
      return this._apnItems.map(function(apnItem) {
        // Convert the apn items to static objects for storing.
        var apnClone = ApnUtils.clone(apnItem.apn);
        apnClone.id = apnItem.id;
        apnClone.category = apnItem.category;
        return apnClone;
      });
    },

    /**
     * Stores the current copy of apn items to async storage.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @returns {Promise}
     */
    _commit: function al__commit() {
      if (!this._apnItems) {
        return Promise.resolve();
      } else {
        var apns = this._export();
        return AsyncStorage.setItem(this._key, apns);
      }
    },

    /**
     * The internal add function.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @params {Object} apn
     * @params {ApnItem.APN_CATEGORY} category
     * @returns {Promise.<String>} The apn id
     */
    _add: function al__add(apn, category) {
      return this.items().then(function(apnItems) {
        if (!apnItems) {
          // set default apn items
          this._apnItems = apnItems = [];
        }

        // Set carrier to _custom_ if the category is custom for backward
        // compatibility
        category = category || ApnItem.APN_CATEGORY.CUSTOM;
        if (category === ApnItem.APN_CATEGORY.CUSTOM) {
          apn.carrier = '_custom_';
        }
        var apnItem = ApnItem(ApnUtils.generateId(), category, apn);

        apnItems.unshift(apnItem);
        return apnItem.id;
      }.bind(this));
    },

    /**
     * The internal remove function.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @params {String} id
     * @returns {Promise}
     */
    _remove: function al__remove(id) {
      return this.items().then(function(apnItems) {
        if (!apnItems) {
          return Promise.reject('no apn items');
        }

        var index = apnItems.findIndex((apnItem) => apnItem.id === id);
        if (index >= 0) {
          apnItems = apnItems.splice(index, 1);
        } else {
          return Promise.reject('apn not found');
        }
      }.bind(this));
    },

    /**
     * The internal update function.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @params {String} id
     * @params {Object} apn
     * @returns {Promise}
     */
    _update: function al__update(id, apn) {
      return this.items().then(function(apnItems) {
        if (!apnItems) {
          return Promise.reject('no apn items');
        }

        var index = apnItems.findIndex((apnItem) => apnItem.id === id);
        if (index >= 0) {
          var currentApn = apnItems[index].apn;
          for (var p in apn) {
            // id and category are not allowed to be changed
            if (p === 'id' || p === 'category') {
              continue;
            }
            currentApn[p] = apn[p];
          }
        } else {
          return Promise.reject('apn not found');
        }
      }.bind(this));
    },

    /**
     * Get all apn items of the list.
     *
     * @access private
     * @memberOf ApnList.prototype
     * @returns {Promise.<Array.<ApnItem>>}
     */
    items: function al_items() {
      // Because add/remove/update depend on this function so we should not
      // schedule it or we will get a dead lock. We return the current copy of
      // apn items.
      if (this._apnItems) {
        return Promise.resolve(this._apnItems);
      } else {
        return AsyncStorage.getItem(this._key).then(function(apns) {
          if (apns) {
            this._apnItems = apns.map(function(apn) {
              return ApnItem(apn.id, apn.category, apn);
            });
            return this._apnItems;
          } else {
            return null;
          }
        }.bind(this));
      }
    },

    /**
     * Get the apn item with a specified id.
     *
     * @access public
     * @memberOf ApnList.prototype
     * @returns {Promise.<ApnItem>}
     */
    item: function al_item(id) {
      // Return the apn item based on the current copy if apn items.
      return this.items().then(function(apnItems) {
        if (!apnItems || !id) {
          return null;
        } else {
          return apnItems.find((apnItem) => apnItem.id === id);
        }
      });
    },

    /**
     * Add an apn to the list with specified category. Returns the id of the
     * newly added apn.
     *
     * @access public
     * @memberOf ApnList.prototype
     * @params {Object} apn
     * @params {ApnItem.APN_CATEGORY} category
     * @returns {Promise.<String>} The apn id
     */
    add: function al_apns(apn, category) {
      var apnClone = ApnUtils.clone(apn);
      return this._schedule(this._add.bind(this, apnClone, category));
    },

    /**
     * Remove an apn from the list.
     *
     * @access public
     * @memberOf ApnList.prototype
     * @params {String} id
     * @returns {Promise}
     */
    remove: function al_remove(id) {
      return this._schedule(this._remove.bind(this, id));
    },

    /**
     * Update an apn. All properties expect for "id" and "category" will be
     * overwritten based on the passed apn object.
     *
     * @access public
     * @memberOf ApnList.prototype
     * @params {String} id
     * @params {Object} apn
     * @returns {Promise}
     */
    update: function al_update(id, apn) {
      var apnClone = ApnUtils.clone(apn);
      return this._schedule(this._update.bind(this, id, apnClone));
    }
  };

  return function ctor_apn_list(key) {
    return new ApnList(key);
  };
});
