/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The Blacklist keeps a list of numbers whose notifications must no progress
// to the user.
var BlackList = (function() {

  // The blacklist is not actually a list, it is a set (order is unimportant),
  // so it is implemented like an object. This improve performance looking
  // for items but decrease speed when changing the blacklist. As changes in
  // the blacklist are unusual, I prefer the search improvement.
  var _blackList = {};

  function _init() {
    SettingsListener.observe('sms.blacklist', '[]',
      function sms_bl_updateBL(list) {
        try {
          list = JSON.parse(list);
        } catch (error) {
          console.warn('Invalid blacklist, current blacklist wont be modified');
          return;
        }

        _blackList = {};
        list.forEach(function sms_bl_addToBL(item) {
          _blackList[item] = true;
        });
      }
    );
  }

  // Return true if value is in the black list
  function _has(value) {
    return _blackList.hasOwnProperty(value);
  }

  return {
    init: _init,
    has: _has
  };

}());

BlackList.init();

