'use strict';
define(function() {
  /**
   * Add an event listener on a container that, when an event is encounted
   * on a descendant, walks up the tree to find the immediate child of the
   * container and tells us what the click was on.
   */
  return function containerListen(containerNode, eventName, func) {
    containerNode.addEventListener(eventName, function(event) {
      var node = event.target;
      // bail if they clicked on the container and not a child...
      if (node === containerNode) {
        return;
      }
      while (node && node.parentNode !== containerNode) {
        node = node.parentNode;
      }
      if (node) {
        func(node, event);
      }
    }, false);
  };
});
