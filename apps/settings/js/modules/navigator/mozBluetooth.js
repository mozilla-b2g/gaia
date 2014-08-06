/**
 * Wraps navigator.bluetooth for replacing it in unit tests more easily.
 */
define(function() {
  'use strict';

  if (navigator.mozBluetooth) {
	return navigator.mozBluetooth;
  } else {
	return null;
  }
});
