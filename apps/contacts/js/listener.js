'use strict';

var ContactsListener = (function() {

  var init = function _init() {
    navigator.mozContacts.oncontactchange = (function(evt) {
      if (this[evt.reason]) {
        this[evt.reason].call(this, evt);
      }
    }).bind(this);
  };

  var clean = function _clean() {
    navigator.mozContacts.oncontactchange = null;
  }

  var setOnUpdate = function _setOnUpdate(cb) {
    this.update = cb;
  };

  var setOnRemove = function _setOnRemove(cb) {
    this.remove = cb;
  };

  var setOnCreate = function _setOnCreate(cb) {
    this.create = cb;
  };

  // Convenience method to have a single cb per change type
  var setOnChange = function _setOnChange(cb) {
    this.update = cb;
    this.remove = cb;
    this.create = cb;
  }

  return {
    'init': init,
    'clean': clean,
    'setOnUpdate': setOnUpdate,
    'setOnRemove': setOnRemove,
    'setOnCreate': setOnCreate,
    'setOnChange': setOnChange
  };

})();

ContactsListener.init();
