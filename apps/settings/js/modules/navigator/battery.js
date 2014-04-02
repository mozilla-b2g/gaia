/**
 * Wraps navigator.battery for replacing it in unit tests more easily.
 */
define(function() {
  'use strict';

  return navigator.battery;
});
