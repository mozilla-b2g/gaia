'use strict';

/* global KeyEvent, KeyboardEvent */

(function(exports) {

/**
 * LayoutNormalizer normalizes a layout's key objects such that
 * Dealing business logics with them will be less painful.
 * @class
 * @param {Object} app the keyboard app instance
 */
var LayoutNormalizer = function() {
};

LayoutNormalizer.prototype._isSpecialKey = function(key) {
  var SPECIAL_CODES = [
    KeyEvent.DOM_VK_BACK_SPACE,
    KeyEvent.DOM_VK_CAPS_LOCK,
    KeyEvent.DOM_VK_RETURN,
    KeyEvent.DOM_VK_ALT
  ];

  var hasSpecialCode = key.keyCode &&
                       (SPECIAL_CODES.indexOf(key.keyCode) !== -1);
  return hasSpecialCode || key.keyCode <= 0;
};

LayoutNormalizer.prototype._getUpperCaseValue = function(key, layout) {
  if (KeyEvent.DOM_VK_SPACE === key.keyCode ||
      this._isSpecialKey(key) ||
      key.compositeKey) {
    return key.value;
  }

  var upperCase = layout.upperCase || {};
  return upperCase[key.value] || key.value.toUpperCase();
};

// normalize one key of the layout
LayoutNormalizer.prototype._normalizeKey = function(key, layout) {
  var keyChar = key.value;
  var upperCaseKeyChar = this._getUpperCaseValue(key, layout);

  var code = key.keyCode || keyChar.charCodeAt(0);
  var upperCode = key.keyCode || upperCaseKeyChar.charCodeAt(0);

  key.keyCode = code;
  key.keyCodeUpper = upperCode;

  key.lowercaseValue = keyChar;
  key.uppercaseValue = upperCaseKeyChar;

  key.isSpecialKey = this._isSpecialKey(key);

  if (key.longPressValue) {
    var longPressKeyCode = key.longPressKeyCode ||
      key.longPressValue.charCodeAt(0);
    key.longPressKeyCode = longPressKeyCode;
  }

  if (key.supportsSwitching) {
    this._normalizeKey(key.supportsSwitching, layout);
  }

  if (KeyboardEvent.DOM_VK_ALT === code && !('targetPage' in key)) {
    console.error('LayoutNormalizer: no targetPage for switching key.');
  }
};

// normalize all keys in the page of the layout
LayoutNormalizer.prototype.normalizePageKeys = function(page, layout) {
  var keyRows = page.keys || [];

  keyRows.forEach(function(keyRow) {
    keyRow.forEach(function(key) {
      this._normalizeKey(key, layout);
    }, this);
  }, this);
};

exports.LayoutNormalizer = LayoutNormalizer;

})(window);
