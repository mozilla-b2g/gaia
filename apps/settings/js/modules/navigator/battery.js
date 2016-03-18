/**
 * Wraps navigator.getBattery() for replacing it in unit tests more easily.
 */
define(function() {
  'use strict';

  return navigator.getBattery();
});
