/**
 * The apn utilities
 */
define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var ApnHelper = require('shared/apn_helper');
  var ApnConst = require('modules/apn/apn_const');
  var ApnItem = require('modules/apn/apn_item');

  var CP_APN_KEY = ApnConst.CP_APN_KEY;
  var DEFAULT_APN_KEY = ApnConst.DEFAULT_APN_KEY;
  var MCC_SETTINGS_KEY = ApnConst.MCC_SETTINGS_KEY;
  var MNC_SETTINGS_KEY = ApnConst.MNC_SETTINGS_KEY;
  var APN_PROPS = ApnConst.APN_PROPS;
  var EU_ROAMING_FILE_PATH = ApnConst.EU_ROAMING_FILE_PATH;

  function _getOperatorCode(serviceId, type) {
    var value;
    var key;

    if (type === 'mcc') {
      value = '000';
      key = MCC_SETTINGS_KEY;
    } else if (type === 'mnc') {
      value = '00';
      key = MNC_SETTINGS_KEY;
    } else {
      return Promise.reject('invalid type');
    }

    return new Promise(function(resolve, reject) {
      SettingsCache.getSettings(function(results) {
        var values = results[key];
        if (values && Array.isArray(values) && values[serviceId]) {
          value = values[serviceId];
        }
        resolve(value);
      });
    });
  }

  /**
   * Helper function. Filter APNs by apn type.
   *
   * @param {String} type
   *                 The apn type we would like to include.
   * @param {ApnItem} apnItem
   */
  function _apnTypeFilter(type, apnItem) {
    if (!type || !apnItem || !apnItem.apn.types) {
      return false;
    } else if (type === '*') {
      return true;
    }
    return apnItem.apn.types.indexOf(type) != -1;
  }

  /**
   * Query <apn> elements matching the mcc/mnc arguments in the apn.json
   * database
   *
   * @param {String} mcc
   * @param {String} mnc
   * @param {String} networkType
   *                 The network type which the APN must be compatible with.
   */
  function _getDefaultApns(mcc, mnc, networkType) {
    // XXX: should fallback to the JSON file if we don't get the apns
    return new Promise(function(resolve, reject) {
      SettingsCache.getSettings(function(results) {
        var apns = results[DEFAULT_APN_KEY] || {};
        resolve(ApnHelper.getCompatible(apns, mcc, mnc, networkType));
      });
    });
  }

  /**
   * Query <apn> elements matching the mcc/mnc arguments in the database
   * received through client provisioning messages.
   *
   * @param {String} mcc
   * @param {String} mnc
   * @param {String} networkType
   *                 The network type which the APN must be compatible with.
   */
  function _getCpApns(mcc, mnc, networkType) {
    return new Promise(function(resolve, reject) {
      SettingsCache.getSettings(function(results) {
        var apns = results[CP_APN_KEY] || {};
        resolve(ApnHelper.getCompatible(apns, mcc, mnc, networkType));
      });
    });
  }

  var _euApnChecked = false;
  var _euApns = null;
  /**
   * Return the EU apns for roaming.
   */
  function _getEuApns() {
    if (_euApnChecked) {
      return Promise.resolve(_euApns);
    } else {
      return _loadJSON(EU_ROAMING_FILE_PATH).then(function(result) {
        _euApnChecked = true;
        // Only return eu apns when both home and foreign operators are
        // specified.
        if (result.home && result.foreign &&
            Object.keys(result.home).length > 0 &&
            Object.keys(result.foreign).length > 0) {
          _euApns = result.defaultApns;
        }
        return _euApns;
      }).catch(function() {
        _euApnChecked = true;
        return null;
      });
    }
  }

  function _generateId() {
    // should refine this
    return Math.random().toString(36).substr(2, 9);
  }

  function _cloneApn(apn) {
    var newApn = {};
    for (var p in apn) {
      newApn[p] = apn[p];
    }
    return newApn;
  }

  function _separateApnsByType(apns) {
    if (!apns) {
      return [];
    }
    return apns.reduce(function(result, apn) {
      // separate the apn by type
      apn.types.forEach(function(type) {
        var cloneApn = _cloneApn(apn);
        cloneApn.types = [type];
        result.push(cloneApn);
      });
      return result;
    }, []);
  }

  function _isMatchedApn(apn1, apn2) {
    if (apn1 == null || apn2 == null) {
      return false;
    }

    // Check if the type of apn1 is the subset of apn2
    if (!apn1.types.every(function(type) {
      return (apn2.types.indexOf(type) !== -1);
    })) {
      return false;
    }

    return APN_PROPS.every(function(prop) {
      if (prop === 'types') {
        // we've already check this property
        return true;
      } else {
        return apn1[prop] === apn2[prop];
      }
    });
  }

  function _sortByCategory(apn1, apn2) {
    if (apn1.category === ApnItem.APN_CATEGORY.PRESET) {
      return true;
    } else if (apn2.category === ApnItem.APN_CATEGORY.PRESET) {
      return false;
    } else {
      return true;
    }
  }

  function _clone(apn) {
    return JSON.parse(JSON.stringify(apn));
  }

  function _loadJSON(path) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onerror = function() {
        reject('Failed to fetch file: ' + path, xhr.statusText);
      };
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.open('GET', path, true); // async
      xhr.responseType = 'json';
      xhr.send();
    });
  }

  return {
    getOperatorCode: _getOperatorCode,
    apnTypeFilter: _apnTypeFilter,
    getDefaultApns: _getDefaultApns,
    getCpApns: _getCpApns,
    getEuApns: _getEuApns,
    generateId: _generateId,
    separateApnsByType: _separateApnsByType,
    isMatchedApn: _isMatchedApn,
    sortByCategory: _sortByCategory,
    clone: _clone
  };
});
