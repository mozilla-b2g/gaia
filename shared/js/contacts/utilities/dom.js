'use strict';

var utils = window.utils || {};

if (!utils.dom) {
  (function(document) {
    var Dom = utils.dom = {};

    // remove all children of a given parent node
    Dom.removeChildNodes = function(node) {
      while (node.hasChildNodes()) {
        node.removeChild(node.firstChild);
      }
    };

    // Given a container, applys the class passed to all the
    // nodes matching a selector.
    // CAUTION: Please be careful using this function as it could
    // be quite expensive depending on the container and selector.
    Dom.addClassToNodes = function(container, selector, clazz) {
      var nodes = container.querySelectorAll(selector);
      for (var i = 0, n = nodes.length; i < n; ++i) {
        nodes[i].classList.add(clazz);
      }
    };

    // Given a container, removes the class passed to all the
    // nodes matching a selector.
    // CAUTION: Please be careful using this function as it could
    // be quite expensive depending on the container and selector.
    Dom.removeClassFromNodes = function(container,
      selector, clazz) {
      var nodes = container.querySelectorAll(selector);
      for (var i = 0, n = nodes.length; i < n; ++i) {
        nodes[i].classList.remove(clazz);
      }
    };

  })(document);
}
