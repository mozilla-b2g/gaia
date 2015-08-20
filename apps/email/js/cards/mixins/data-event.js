'use strict';
define(function () {
  var slice = Array.prototype.slice;

  return {
    templateInsertedCallback: function () {
      slice.call(this.querySelectorAll('[data-event]'))
      .forEach(function (node) {
        var parent = node;
        // Make sure the node is not nested in another component.
        while ((parent = parent.parentNode)) {
          if (parent.nodeName.indexOf('-') !== -1) {
            if (parent !== this) {
              return;
            }
            break;
          }
        }
        if (!parent) {
          return;
        }

        // Value is of type 'name:value,name:value',
        // with the :value part optional.
        node.dataset.event.split(',').forEach(function (pair) {
          var evtName, method,
              parts = pair.split(':');

          if (!parts[1]) {
            parts[1] = parts[0];
          }
          evtName = parts[0].trim();
          method = parts[1].trim();

          if (typeof this[method] !== 'function') {
            throw new Error('"' + method +
                            '" is not a function, cannot bind with data-event');
          }

          node.addEventListener(evtName, function(evt) {
            // Treat these events as private to the
            // custom element.
            evt.stopPropagation();
            return this[method](evt);
          }.bind(this), false);
        }.bind(this));
      }.bind(this));
    }
  };
});
