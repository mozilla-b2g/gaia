'use strict';
/**
 * Taken from the ECMAScript proposal polyfill in the repo:
 * https://github.com/benjamingr/RegExp.escape
 * git commit: de7b32f9f72d15f9d580119963139d1027c46bbe
 * Copyright CC0 1.0 Universal Benjamin Gruenbaum 2015
 */

define(function() {
  return function regExpEscape(str) {
    return str.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  };
});
