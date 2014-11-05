/**
 * ApnItem is a wrapper of apn objects. 
 *
 * @module modules/apn/apn_item
 */
define(function(require) {
  'use strict';

  var APN_CATEGORY = {
    PRESET: 'preset',
    CUSTOM: 'custom',
    EU: 'eu'
  };

  /**
   * @class ApnItem
   * @params {String} id
   * @params {String} category
   * @params {Object} apn
   * @returns {ApnItem}
   */
  function ApnItem(id, category, apn) {
    this._id = id;
    this._category = category;
    this._apn = apn;
  }

  ApnItem.prototype = {
    get id() {
      return this._id;
    },
    get category() {
      return this._category;
    },
    get apn() {
      return this._apn;
    }
  };

  var constructor = function ctor_apn_item(id, category, apn) {
    return new ApnItem(id, category, apn);
  };
  constructor.APN_CATEGORY = APN_CATEGORY;

  return constructor;
});
