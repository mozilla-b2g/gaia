/*global define*/

define(function(require) {
  'use strict';

  return function(query, el) {
    el = el || document;
    return el.querySelector(query);
  };
});
