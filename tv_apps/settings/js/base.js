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

  exports.Base = Base;

})(window);

