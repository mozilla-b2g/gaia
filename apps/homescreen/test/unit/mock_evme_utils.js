'use strict';

var Evme = window.Evme || {};

Evme.Utils = {
  pluck: function pluck(collection, property) {
    if (Array.isArray(collection)) {
      return collection.map(function(item) {
        return item[property];
      });
    } else {
      return [];
    }
  }
};
