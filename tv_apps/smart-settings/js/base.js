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
    })
  };

  exports.Base = Base;

})(window);

