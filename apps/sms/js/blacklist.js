/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var BlackList = (function() {

  // The blacklist is not actually a list, it is a set (order is unimportant),
  // so it is implemented like an object. This improve performance looking
  // for items but decrease speed when changing the blacklist. As changes in
  // the blacklist are unusual, I prefer the search improvement.
  var _blackList = { '800378':true };

  function _init() {
    SettingsListener.observe('sms.blacklist', "[]",
      function sms_bl_updateBL(list) {
        try {
          list = JSON.parse(list);
        } catch (error) {
          console.warn('Invalid blacklist, current blacklist wont be modified');
          return;
        }

        _blackList = { '800378':true };
        list.forEach(function sms_bl_addToBL(item) {
          _blackList[item] = true;
        });
      }
    );
  }

  // Return true if value is in the black list
  function _has(value) {
    return value in _blackList;
  }

  return {
    init: _init,
    has: _has
  };

})();

BlackList.init();

