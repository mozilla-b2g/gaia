'use strict';

var ContactsListener = (function() {

  var init = function _init() {
    navigator.mozContacts.oncontactchange = (function(evt) {
      if (this[evt.reason]) {
        this[evt.reason].call(this, evt);
      }
    }).bind(this);
  };

  var setOnUpdate = function _setOnUpdate(cb) {
    this.update = cb;
  };

  var setOnRemove = function _setOnRemove(cb) {
    this.remove = cb;
  };

  var setOnCreate = function _setOnCreate(cb) {
    this.create = cb;
  };

  return {
    'init': init,
    'setOnUpdate': setOnUpdate,
    'setOnRemove': setOnRemove,
    'setOnCreate': setOnCreate
  };

})();

ContactsListener.init();