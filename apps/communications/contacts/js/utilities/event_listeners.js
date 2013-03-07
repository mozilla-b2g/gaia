'use strict';

var utils = window.utils || {};

if (!utils.listeners) {
  (function(document) {
    var Listeners = utils.listeners = {};

    Listeners.add = function(config) {
      try {
        for (var id in config) {
          var handler = config[id];
          var nodes = document.querySelectorAll(id);
          for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (Array.isArray(handler)) {
              handler.forEach(function handle(item) {
                if (!item.hasOwnProperty('event') &&
                    !item.hasOwnProperty('handler')) {
                  return;
                }
                node.addEventListener(item.event, item.handler);
              });
            } else {
                node.addEventListener('click', handler);
            }
          } // nodes
        } // Handlers
      }
      catch (e) {
        window.console.error('Error while registering listener for: ', id, e);
      }
    }; // Add function

  })(document);
}
