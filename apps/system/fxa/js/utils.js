/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {
  var rdashes = /-(.)/g;
  var Utils = {
    camelCase: function ut_camelCase(str) {
      return str.replace(rdashes, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    },

    once: function(element, eventName, handler) {
      if (typeof element === 'string') {
        element = document.querySelector(element);
      }

      element.addEventListener(eventName, function handlerDecorator(event) {
        element.removeEventListener(eventName, handlerDecorator, false);
        handler.call(this, event);
      }, false);
    },

    // import elements into context. The first argument
    // is the context to import into, each subsequent
    // argument is the id of an element to import.
    // Elements can be accessed using the camelCased id
    importElements: function importElements(context) {
      var ids = [].slice.call(arguments, 1);
      ids.forEach(function(id) {
        context[Utils.camelCase(id)] = document.getElementById(id);
      });
    }
  };

  exports.Utils = Utils;

}(window));
