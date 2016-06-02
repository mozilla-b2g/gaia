'use strict';
define(function () {
  return {
    templateInsertedCallback: function () {
      var node, parent,
          nodes = this.querySelectorAll('[data-prop]'),
          length = nodes.length;

      for (var i = 0; i < length; i++) {
        // Make sure the node is not nested in another component.
        node = nodes[i];
        parent = node;
        while ((parent = parent.parentNode)) {
          if (parent.nodeName.indexOf('-') !== -1) {
            if (parent !== this) {
              node = null;
            }
            break;
          }
        }

        if (node && parent) {
          this[node.dataset.prop] = nodes[i];
        }
      }
    }
  };
});
