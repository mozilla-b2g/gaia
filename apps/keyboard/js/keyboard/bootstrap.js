'use strict';

/* global KeyboardApp */

// This file should be considered frozen and nothing should be added here,
// ever. It's also intentionally not covered in unit test suites.
(function(exports) {

var app = new KeyboardApp();
app.start();

// Ideally we shouldn't be exposing the instance to the world, however
// we still need to work with legacy keyboard.js code and
// allow incorrect access of Gaia UI tests for getting our states.
//
// JS Console is probably the only valid use case to access this.
exports.app = app;

})(window);
