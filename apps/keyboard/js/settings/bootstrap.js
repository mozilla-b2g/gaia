'use strict';

/* global KeyboardSettingsApp */

// This file should be considered frozen and nothing should be added here,
// ever. It's also intentionally not covered in the unit test suite.
(function(exports) {

var app = new KeyboardSettingsApp();
app.start();

// Expose the instance to JS Console.
exports.app = app;

})(window);
