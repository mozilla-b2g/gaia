/* global module, require */
'use strict';

var assert = require('chai').assert;

module.exports = {
  assertElementFocused: function(element, message) {
    assert.isTrue(
      element.scriptWith(function(el) {
        return document.activeElement === el;
      }),
      message
    );
  }
};
