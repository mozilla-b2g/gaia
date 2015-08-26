'use strict';
/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
(function(exports) {
  /**
   * CardsHelper provides utilities and helper methods
   * for dealing with task manager / card view and their cards
   *
   * @module CardsHelper
   */

  function getOffOrigin(src, origin) {
    // Use src and origin as cache key
    src = src || origin;
    var cacheKey = JSON.stringify(Array.prototype.slice.call(arguments));
    if (!getOffOrigin.cache[cacheKey]) {
      var native = new URL(origin);
      var current = new URL(src);
      if (current.protocol == 'http:') {
        // Display http:// protocol anyway
        getOffOrigin.cache[cacheKey] = current.protocol + '//' +
          current.hostname;
      } else if (native.protocol == current.protocol &&
        native.hostname == current.hostname &&
        native.port == current.port) {
        // Same origin policy
        getOffOrigin.cache[cacheKey] = '';
      } else if (current.protocol == 'app:') {
        // Avoid displaying app:// protocol
        getOffOrigin.cache[cacheKey] = '';
      } else {
        getOffOrigin.cache[cacheKey] = current.protocol + '//' +
          current.hostname;
      }
    }

    return getOffOrigin.cache[cacheKey];
  }
  getOffOrigin.cache = {};

  exports.CardsHelper = {
    getOffOrigin: getOffOrigin
  };

})(window);
