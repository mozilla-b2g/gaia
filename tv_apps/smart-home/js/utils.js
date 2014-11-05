(function(exports) {
  'use strict';

  exports.addMixin = function(obj, mixin) {
    for (var prop in mixin) {
      if (mixin.hasOwnProperty(prop)) {
        if (!obj.prototype.hasOwnProperty(prop)) {
          obj.prototype[prop] = mixin[prop];
        }
      }
    }
  };

}(window));
