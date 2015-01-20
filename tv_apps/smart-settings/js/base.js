'use strict';
/* global evt */

(function(exports) {
  function Base() {
  }

  Base.prototype = new evt();

  Base.prototype.bindSelf = function b_bindSelf() {
    for (var key in this) {
      if ((typeof this[key]) === 'function') {
        this[key] = this[key].bind(this);
      }
    }
  };

  Base.prototype.nodeListToArray = function b_nodeListToArray(obj) {
    return [].map.call(obj, function(element) {
      return element;
    });
  };

  Base.prototype.simulateKeyEvent = function b_simulateKeyEvent(keyCode,
      charCode, ctrl, alt, shift, meta) {
    var evt = document.createEvent('KeyboardEvent');
    evt.initKeyEvent('keydown', true, true, null, ctrl || false, alt || false,
                     shift || false, meta || false, keyCode, charCode || 0);
    window.dispatchEvent(evt);

    evt = document.createEvent('KeyboardEvent');
    evt.initKeyEvent('keyup', true, true, null, ctrl || false, alt || false,
                     shift || false, meta || false, keyCode, charCode || 0);
    window.dispatchEvent(evt);

    evt = document.createEvent('KeyboardEvent');
    evt.initKeyEvent('keypress', true, true, null, ctrl || false, alt || false,
                     shift || false, meta || false, keyCode, charCode || 0);
    window.dispatchEvent(evt);
  };

  exports.Base = Base;

})(window);

