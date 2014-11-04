'use strict';
define(function () {
  return {
    templateInsertedCallback: function () {
      var nodes = this.querySelectorAll('[data-prop]'),
          length = nodes.length;

      for (var i = 0; i < length; i++) {
        this[nodes[i].dataset.prop] = nodes[i];
      }
    }
  };
});
