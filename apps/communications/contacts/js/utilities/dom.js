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

  })(document);
}
