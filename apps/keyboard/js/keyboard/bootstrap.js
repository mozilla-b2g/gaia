'use strict';

/* global KeyboardApp */

// This file should be considered frozen and nothing should be added here,
// ever. It's also intentionally not covered in the unit test suite.
(function(exports) {

var app = new KeyboardApp();
app.start();

// Ideally we shouldn't be exposing the instance to the world, however
// we still need to allow incorrect access of Gaia UI tests
// for getting our states.
//
// See tests/python/gaia-ui-tests/gaiatest/apps/keyboard/app.py.
//
// JS Console is probably the only valid use case to access this.
exports.app = app;

})(window);
