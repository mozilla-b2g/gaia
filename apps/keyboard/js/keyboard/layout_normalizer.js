'use strict';

/* global KeyEvent, KeyboardEvent */

(function(exports) {

/**
 * LayoutNormalizer normalizes a layout's key objects such that
 * Dealing business logics with them will be less painful.
 * @class
 * @param {Object} layout the layout we're going to normalize
 */
var LayoutNormalizer = function(layout) {
  this._layout = layout;
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

LayoutNormalizer.prototype._getUpperCaseValue = function(key) {
  if (KeyEvent.DOM_VK_SPACE === key.keyCode ||
      this._isSpecialKey(key) ||
      key.compositeKey) {
    return key.value;
  }

  var upperCase = this._layout.upperCase || {};
  return upperCase[key.value] || key.value.toUpperCase();
};

// normalize one key of the layout
LayoutNormalizer.prototype._normalizeKey = function(key) {
  var keyChar = key.value;
  var upperCaseKeyChar = this._getUpperCaseValue(key);

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
    this._normalizeKey(key.supportsSwitching);
  }

  if (KeyboardEvent.DOM_VK_ALT === code && !('targetPage' in key)) {
    console.error('LayoutNormalizer: no targetPage for switching key.');
  }

  // XXX: we modify space key and enter key in layout_manager
  //      so we can't freeze them
  if(key.keyCode !== KeyboardEvent.DOM_VK_SPACE &&
     key.keyCode !== KeyboardEvent.DOM_VK_RETURN) {
    return Object.freeze(key);
  }else{
    return key;
  }
};

// normalize all keys in the page of the layout
LayoutNormalizer.prototype._normalizePageKeys = function(page) {
  var keyRows = page.keys || [];

  page.keys = keyRows.map(function(keyRow) {
    return keyRow.map(function(key) {
      return this._normalizeKey(key);
    }, this);
  }, this);

  var overwrites = page.textLayoutOverwrite || {};

  page.textLayoutOverwrite =
    Object.keys(overwrites).reduce(function(result, overwrittenKey){
    if (false === overwrites[overwrittenKey]) {
      result[overwrittenKey] = false;
    } else {
      result[overwrittenKey] =
        this._normalizeKey({value: overwrites[overwrittenKey]});
    }
    return result;
  }.bind(this), {});
};

// normalize alt keys in the page of the layout
LayoutNormalizer.prototype._normalizePageAltKeys = function(page) {
  // XXX: move alt char normalization to the normalizer
  var alt = page.alt = page.alt || {};
  var upperCase = page.upperCase = page.upperCase || {};
  var altKeys = Object.keys(alt);
  altKeys.forEach(function(key) {
    var alternatives = alt[key];

    // Split alternatives
    // If the alternatives are delimited by spaces, it means that one or more
    // of them is more than a single character long.
    if (!Array.isArray(alternatives)) {
      if (alternatives.indexOf(' ') !== -1) {
        alternatives = alternatives.split(' ');

        // If there is just a single multi-character alternative, it will have
        // trailing whitespace which we have to discard here.
        if (alternatives.length === 2 && alternatives[1] === '') {
          alternatives.pop();
        }
      } else {
        // No spaces, so all of the alternatives are single characters
        alternatives = alternatives.split('');
      }
    }

    alt[key] = alternatives;

    var upperCaseKey = upperCase[key] || key.toUpperCase();
    if (!alt[upperCaseKey]) {
      var needDifferentUpperCaseLockedAlternatives = false;
      // Creating an array for upper case too.
      // XXX: The original code does not respect page.upperCase here.
      alt[upperCaseKey] = alternatives.map(function(key) {
        if (key.length === 1) {
          return key.toUpperCase();
        }

        // The 'l·l' key in the Catalan layout needs to be
        // 'L·l' in upper case mode and 'L·L' in upper case locked mode.
        // (see http://bugzil.la/896363#c19)
        // If that happens we will create a different array for
        // upper case locked mode.

        // Last chance for figuring out if we need a different list of
        // alternatives; if key.substr(1) has no upper case form,
        // (e.g. R$ key) we should be able to skip this.
        needDifferentUpperCaseLockedAlternatives =
          needDifferentUpperCaseLockedAlternatives ||
          (key.substr(1).toUpperCase() !== key.substr(1));

        // We only capitalize the first character of the key in
        // the normalization here.
        return key[0].toUpperCase() + key.substr(1);
      });

      // If we really need an special upper case locked alternatives,
      // do it here and attach that as a property of the
      // alt[upperCaseKey] array/object. Noted that this property of the array
      // can't be represented in JSON so it's not visible in JSON.stringify().
      if (needDifferentUpperCaseLockedAlternatives) {
        alt[upperCaseKey].upperCaseLocked = alternatives.map(function(key) {
          return key.toUpperCase();
        });
      }
    }
  }, this);
};

// In order to keep the commit log sane, some amendments of the
// layout JS structure are fix here in runtime instead of hardcoded.
// TODO: normalize the layout files and maybe remove this function.
LayoutNormalizer.prototype.normalize = function() {
  var pages;
  if ('pages' in this._layout) {
    pages = this._layout.pages;
  } else {
    pages = this._layout.pages = [];
  }

  if (!pages[0]) {
    pages[0] = {};

    // These are properties of the basic page that previously put in the layout
    // itself. We should move them to the page object and remove them from
    // the layout object.
    ['alt', 'keys', 'upperCase', 'width', 'keyClassName',
      'typeInsensitive', 'textLayoutOverwrite',
      'needsCommaKey', 'secondLayout', 'specificCssRule'
    ].forEach(function(prop) {
      if (this._layout[prop]) {
        pages[0][prop] = this._layout[prop];
        delete this._layout[prop];
      }
    }, this);
  }

  // Normalize key properties such that other modules can deal with them easily
  // Also, go through each pages and inspect it's "alt" property;
  // we want to normalize our existing mixed notations into arrays.
  pages.forEach(function(page) {
    this._normalizePageKeys(page);
    this._normalizePageAltKeys(page);
  }, this);
};

exports.LayoutNormalizer = LayoutNormalizer;

})(window);
