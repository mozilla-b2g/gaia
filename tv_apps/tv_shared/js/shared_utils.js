(function(exports) {
  'use strict';
  exports.SharedUtils = {
    nodeListToArray: function su_nodeListToArray(obj) {
      return [].map.call(obj, function(element) {
        return element;
      });
    },

    addMixin: function su_addMixin(obj, mixin) {
      for (var prop in mixin) {
        if (mixin.hasOwnProperty(prop)) {
          if (!obj.prototype.hasOwnProperty(prop)) {
            obj.prototype[prop] = mixin[prop];
          }
        }
      }
    }
  };

}(window));
