'use strict';

/* global KeyboardEvent, LayoutLoader, Promise */

/** @fileoverview These are special keyboard layouts.
 * Language-specific layouts are in individual js files in layouts/ .
 */

(function(exports) {

/**
 * LayoutManager do one and only simply job: Allow you to switch currentLayout,
 * tell you when it is ready, and give you access to it.
 * @class
 * @param {Object} app the keyboard app instance
 */
var LayoutManager = function(app) {
  this.app = app;

  // Current Layout is the layout loaded.
  // Other modules most likely need currentModifiedLayout instead of this one.
  this.currentLayout = null;
  this.currentLayoutName = undefined;

  // IME sometimes want to force switch to a specific layout,
  // we record that information here.
  this.currentForcedModifiedLayoutName = undefined;

  // currentModifiedLayout is the layout definition needed according to
  // the current input mode and the layout page.
  // It's always an object with "modifications" of it's prototype parent.
  this.currentModifiedLayout = null;
  this.currentLayoutPage = this.LAYOUT_PAGE_DEFAULT;
};

LayoutManager.prototype.start = function() {
  this.loader = new LayoutLoader();
  this.loader.start();

  this._switchStateId = 0;
};

// Special key codes on special buttons
LayoutManager.prototype.KEYCODE_BASIC_LAYOUT = -1;
LayoutManager.prototype.KEYCODE_ALTERNATE_LAYOUT = -2;
LayoutManager.prototype.KEYCODE_SWITCH_KEYBOARD = -3;
LayoutManager.prototype.KEYCODE_TOGGLE_CANDIDATE_PANEL = -4;
LayoutManager.prototype.KEYCODE_SYMBOL_LAYOUT = -5;

LayoutManager.prototype.LAYOUT_PAGE_DEFAULT = 0;
LayoutManager.prototype.LAYOUT_PAGE_SYMBOLS_I = 1;
LayoutManager.prototype.LAYOUT_PAGE_SYMBOLS_II = 2;

/*
 * Switch switchCurrentLayout() will switch the current method to the
 * desired layout. It also loads the layout from it's layout file with
 * LayoutLoader.
 *
 * This method returns a promise and it resolves when the layout is ready.
 * If a second call took place before the previous promise resolves,
 * the previous call will be rejected.
 *
 */
LayoutManager.prototype.switchCurrentLayout = function(layoutName) {
  var switchStateId = ++this._switchStateId;

  var loaderPromise = this.loader.getLayoutAsync(layoutName);
  var p = loaderPromise.then(function(layout) {
    if (switchStateId !== this._switchStateId) {
      console.log('LayoutManager: ' +
        'Promise is resolved after another switchCurrentLayout() call.');

      return Promise.reject();
    }

    this.currentLayout = layout;
    this.currentLayoutName = layoutName;
    this.currentLayoutPage = this._getInitLayoutPage();
    this.currentForcedModifiedLayoutName = this._getInitForcedLayoutName();

    this._updateModifiedLayout();
  }.bind(this));

  return p;
};

/*
 * Sometime IME may want to force render a specific layout.
 * Instead of overwrite currentLayout, we keep that information in
 * currentForcedModifiedLayoutName and update the currentModifiedLayout.
 *
 * Please consider specifying an layout specific alternative/symbol layout page
 * when possible, instead of leveraging this feature.
 *
 */
LayoutManager.prototype.updateForcedModifiedLayout = function(layoutName) {
  if (!this.loader.getLayout(layoutName)) {
    throw new Error('LayoutManager: update to a non-exist forced layout ' +
      layoutName);
  }
  this.currentForcedModifiedLayoutName = layoutName;
  this._updateModifiedLayout();
};

/*
 * Layout page refer to alternative/symbol layout of the current layout.
 * It will be the default alternative/symbol layout if the currentLayout
 * does not overwrite them.
 *
 * This function keep the information in currentLayoutPage and
 * update the specific layout to currentModifiedLayout.
 *
 */
LayoutManager.prototype.updateLayoutPage = function(page) {
  switch (page) {
    case this.LAYOUT_PAGE_DEFAULT:
    case this.LAYOUT_PAGE_SYMBOLS_I:
    case this.LAYOUT_PAGE_SYMBOLS_II:
      this.currentLayoutPage = page;
      // Reset currentForcedModifiedLayoutName, for the case to go back to
      // default or symbol page from self-defined layout page.
      this.currentForcedModifiedLayoutName = null;
      this._updateModifiedLayout();

      break;

    default:
      throw new Error('LayoutManager: undefined layout page.');
  }
};

/*
 * This function takes the currentLayout, makes and empty layout with prototype
 * points to the currentLayout, and then modifies it to add meta keys for
 * switching languages and switching to numbers and symbols.
 * It may also add keys (like a "/" and '@') that are specific to input
 * of basic input type.
 *
 * The result is saved to currentModifiedLayout.
 */
LayoutManager.prototype._updateModifiedLayout = function() {
  // If there isn't an inputContext or there is no currentLayout,
  // clean up modified layout.
  if (!this.app.inputContext || !this.currentLayout) {
    this.currentModifiedLayout = null;
    return;
  }

  // These are external information we need outside of our own module
  // to generate the new modified layout.
  var inputMode = this.app.inputContext.inputMode;
  var basicInputType = this.app.getBasicInputType();
  var supportsSwitching = this.app.supportsSwitching();

  // We might need to switch to a alternative layout
  var alternativeLayoutName =
    this._getAlternativeLayoutName(basicInputType, inputMode);

  var layout;
  if (this.currentForcedModifiedLayoutName) {
    layout = this.loader.getLayout(this.currentForcedModifiedLayoutName);
  } else if (alternativeLayoutName) {
    layout = this.currentLayout[alternativeLayoutName] ||
      this.loader.getLayout(alternativeLayoutName);
  } else {
    layout = this.currentLayout;
  }

  // Create an empty object with prototype point to the original one
  // to prevent from modifying it.
  layout = Object.create(layout);

  // Look for the space key in the layout. We're going to insert
  // meta keys before it or after it.
  var spaceKeyFindResult = this._findKey(layout, KeyboardEvent.DOM_VK_SPACE);
  var spaceKeyRowCount = spaceKeyFindResult.keyRowCount;
  var spaceKeyCount = spaceKeyFindResult.keyCount;

  if (!spaceKeyFindResult.keyFound) {
    console.warn('LayoutManager:' +
      'No space key found. No special keys will be added.');
    this.currentModifiedLayout = layout;
    // renderer need these information to cache the DOM tree.
    layout.layoutName = this.currentForcedModifiedLayoutName ||
      this.currentLayoutName;
    layout.alternativeLayoutName = alternativeLayoutName;
    // inherit the same imEngine name if it's not set so render will apply the
    // same style.
    if (this.currentLayout.imEngine && !layout.imEngine) {
      layout.imEngine = this.currentLayout.imEngine;
    }

    return;
  }

  // We are going to modify the keys array, spaceKeyRow array and the space key
  // itself, so these arrays must be re-created and object must be replaced with
  // an empty one.
  //
  // ... make a copy of the entire keys array,
  layout.keys = [].concat(layout.keys);
  var copiedRows = [];
  // ... and point row containing space key object to a new array,
  var spaceKeyRow = layout.keys[spaceKeyRowCount] =
    [].concat(layout.keys[spaceKeyRowCount]);
  copiedRows.push(spaceKeyRowCount);
  // ... the space key object should be point to a new object too.
  var spaceKeyObject = layout.keys[spaceKeyRowCount][spaceKeyCount] =
    Object.create(layout.keys[spaceKeyRowCount][spaceKeyCount]);

  var enterKeyFindResult = this._findKey(layout, KeyboardEvent.DOM_VK_RETURN);
  var enterKeyCount = enterKeyFindResult.keyCount;
  // Assume the [Enter] is at the same row as the space key
  var enterKeyObject = layout.keys[spaceKeyRowCount][enterKeyCount] =
    Object.create(layout.keys[spaceKeyRowCount][enterKeyCount]);

  // Keep the pageSwitchingKey here, because we may need to modify its ratio
  // at the end.
  var pageSwitchingKeyObject = null;

  // Insert switch-to-symbol-and-back keys
  if (!layout.disableAlternateLayout) {
    spaceKeyObject.ratio -= 2;
    if (this.currentLayoutPage === this.LAYOUT_PAGE_DEFAULT) {
      pageSwitchingKeyObject = {
        keyCode: this.KEYCODE_ALTERNATE_LAYOUT,
        value: layout.alternateLayoutKey || '12&',
        ratio: 2,
        ariaLabel: 'alternateLayoutKey',
        className: 'page-switch-key'
      };
    } else {
      pageSwitchingKeyObject = {
        keyCode: this.KEYCODE_BASIC_LAYOUT,
        value: this.currentLayout.basicLayoutKey || 'ABC',
        ratio: 2,
        ariaLabel: 'basicLayoutKey',
        className: 'page-switch-key'
      };
    }

    spaceKeyRow.splice(spaceKeyCount, 0, pageSwitchingKeyObject);
    spaceKeyCount++;
  }

  // Insert switch-to-another-layout button
  var needsSwitchingKey = supportsSwitching && !layout.hidesSwitchKey;
  if (needsSwitchingKey) {
    var imeSwitchKey = {
      value: '&#x1f310;', // U+1F310 GLOBE WITH MERIDIANS
      ratio: 1,
      keyCode: this.KEYCODE_SWITCH_KEYBOARD,
      className: 'switch-key'
    };

    // Replace the label with short label if there is one
    if (this.currentLayout.shortLabel) {
      imeSwitchKey.value = this.currentLayout.shortLabel;
      imeSwitchKey.className += ' alternate-indicator';
    }

    spaceKeyObject.ratio -= 1;
    spaceKeyRow.splice(spaceKeyCount, 0, imeSwitchKey);
    spaceKeyCount++;

    // Replace the key with supportsSwitching alternative defined.
    // This is because we won't have ',' at the bottom, and we would
    // move it to other place.
    var r = layout.keys.length, c, row, key;
    while (r--) {
      row = layout.keys[r];
      c = row.length;
      while (c--) {
        key = row[c];
        if (key.supportsSwitching) {
          if (copiedRows.indexOf(r) === -1) {
            layout.keys[r] = [].concat(layout.keys[r]);
            copiedRows.push(r);
          }
          layout.keys[r][c] = Object.create(key.supportsSwitching);
        }
      }
    }
  }

  // Respond to different input types
  if (!layout.typeInsensitive) {
    var periodKey = {
      value: '.',
      ratio: 1,
      keyCode: 46
    };
    if (layout.alt && layout.alt['.']) {
      periodKey.className = 'alternate-indicator';
    }


    var modifyType = 'default';
    // We have different rules to handle the default layout page and
    // symbol/alternate page.
    // Only insert special character, such as '@' for email, '/' for url
    // on the default layout page.
    if (this.currentLayoutPage === this.LAYOUT_PAGE_DEFAULT) {
      switch (basicInputType) {
        case 'url':
          modifyType = 'url';
          break;
        case 'email':
          modifyType = 'email';
          break;
        case 'text':
          modifyType = 'default';
          break;
        case 'search':
          modifyType = 'search';
          break;
      }
    } else {
      if ('search' === basicInputType) {
        modifyType = 'search';
      }else{
        modifyType = 'default';
      }
    }

    switch (modifyType) {
      case 'url':
        spaceKeyObject.ratio -= 2.0;
        // Add '/' key when we are at the default page
        spaceKeyRow.splice(spaceKeyCount, 0, {
          value: '/',
          ratio: 1,
          keyCode: 47
        });
        spaceKeyCount++;

        // period key (after space key)
        spaceKeyRow.splice(spaceKeyCount + 1, 0, periodKey);

        break;

      case 'email':
        spaceKeyObject.ratio -= 2;
        // Add '@' key when we are at the default page
        spaceKeyRow.splice(spaceKeyCount, 0, {
          value: '@',
          ratio: 1,
          keyCode: 64
        });
        spaceKeyCount++;

        // period key (after space key)
        spaceKeyRow.splice(spaceKeyCount + 1, 0, periodKey);

        break;

      case 'search':
        if (enterKeyObject) {
          enterKeyObject.className = 'search-icon';
        }
        // fall through to take modifications from default layouts

      /* falls through */
      case 'default':
        var overwrites = layout.textLayoutOverwrite || {};
        // Add comma key if we are asked to,
        // Only add the key if we didn't add the switching key.
        // Add comma key in any page if needsCommaKey is
        // set explicitly.
        if (overwrites[','] !== false &&
            (!needsSwitchingKey ||
             layout.needsCommaKey)) {
          var commaKey = {
            value: ',',
            ratio: 1,
            keyCode: 44
          };

          if (overwrites[',']) {
            commaKey.value = overwrites[','];
            commaKey.keyCode = overwrites[','].charCodeAt(0);
          }

          spaceKeyObject.ratio -= 1;
          spaceKeyRow.splice(spaceKeyCount, 0, commaKey);
          spaceKeyCount++;
        }

        // Only add peroid key if we are asked to.
        if (overwrites['.'] !== false) {
          if (overwrites['.']) {
            periodKey.value = overwrites['.'];
            periodKey.keyCode = overwrites['.'].charCodeAt(0);
          }

          spaceKeyObject.ratio -= 1;
          // peroid key (after space key)
          spaceKeyRow.splice(spaceKeyCount + 1, 0, periodKey);
        }

        break;
    }
  }

  /*
   * The rule to determine the default width for pageSwitchingKey
   *  1. If there is only one key at the right and left side of space key then,
   *     it is 2x key width.
   *
   *  2. If there are more than 2 keys to left side of space key
   *     pageSwitchingKey: 1.5 x
   *     [Enter] key: 2.5 x
   */

  var keyCount = layout.width ? layout.width : 10;
  if (!layout.disableAlternateLayout) {
    if( spaceKeyCount == 3 && keyCount == 10) {
      // We're going to modify the [Enter] key size to sync with panel
      // switching key or align with the above row.
      if (enterKeyObject) {
        enterKeyObject.ratio = 2.5;
      }

      pageSwitchingKeyObject.ratio = 1.5;
    }
  }

  this.currentModifiedLayout = layout;

  // renderer need these information to cache the DOM tree.
  layout.layoutName = this.currentForcedModifiedLayoutName ||
    this.currentLayoutName;
  layout.alternativeLayoutName = alternativeLayoutName;
  // inherit the same imEngine name if it's not set so render will apply the
  // same style.
  if (this.currentLayout.imEngine && !layout.imEngine) {
    layout.imEngine = this.currentLayout.imEngine;
  }
};

// we may launch into some alternative layout page
// for some specific input types/modes
// for bug 1024298, launch into symbols 1 page for number-type inputs
// XXX: if the inputMode is 'digit', we need to launch 'pinLayout';
//      the first switch-case in _getAlternativeLayoutName would not allow
//      launching pinLayout if we set _SYMBOLS_I here,
//      so need to bypass 'digit' case
LayoutManager.prototype._isNumberTypeInput = function() {
  var inputMode = this.app.inputContext.inputMode;
  var basicInputType = this.app.getBasicInputType();

  return (('number' === basicInputType && 'digit' !== inputMode) ||
          ('text' === basicInputType && 'numeric' === inputMode)) ;
};

LayoutManager.prototype._getInitLayoutPage = function() {
  return this._isNumberTypeInput() ?
           this.LAYOUT_PAGE_SYMBOLS_I : this.LAYOUT_PAGE_DEFAULT ;
};

// for some imes like chinese-pinyin/zhuyin, we want to launch into half-width
// (forced) layout for number-type input
LayoutManager.prototype._getInitForcedLayoutName = function() {
  return ('defaultNumberLayout' in this.currentLayout &&
          this._isNumberTypeInput()) ?
         this.currentLayout.defaultNumberLayout :
         undefined ;
};

LayoutManager.prototype._getAlternativeLayoutName = function(basicInputType,
                                                             inputMode) {
  switch (this.currentLayoutPage) {
    case this.LAYOUT_PAGE_SYMBOLS_I:
      return 'alternateLayout';

    case this.LAYOUT_PAGE_SYMBOLS_II:
      return 'symbolLayout';
  }

  switch (basicInputType) {
    case 'tel':
      return 'telLayout';

    case 'number':
      switch (inputMode) {
        case 'digit':
          return 'pinLayout';
      }

      break;

    // This matches when type="password", "text", or "search",
    // see getBasicInputType() for details
    case 'text':
      switch (inputMode) {
        case 'digit':
          return 'pinLayout';

        case '-moz-sms':
          var smsLayoutName = this.currentLayoutName + '-sms';
          if (this.loader.getLayout(smsLayoutName)) {
            return smsLayoutName;
          }
      }

      break;
  }

  // We don't need an alternative layout name.
  return '';
};

/**
 * Find a key with the specific keyCode in the layout
 * @memberof LayoutManager.prototype
 * @param {Object} layout The layout object
 * @param {number} keyCode The keyCode we use to match the key
 * @returns {Object} findResult The result of the search
 * @returns {boolean} findResult.keyFound true if the key has been found
 * @returns {number} findResult.keyRowCount the row position of the key
 * @returns {number} findResult.keyCount the position of the key in the row
 */
LayoutManager.prototype._findKey = function(layout, keyCode) {
  // Look up from the last row because the key we need to modify, such as
  // the space key and the [Enter] key, are usually
  // at the last row.
  var r = layout.keys.length, c, row, key;

  while (r--) {
    row = layout.keys[r];
    c = row.length;
    while (c--) {
      key = row[c];
      if (key.keyCode == keyCode) {
        return {
          keyFound: true,
          keyRowCount: r,
          keyCount: c
        };
      }
    }
  }

  return {
    keyFound: false,
    keyRowCount: -1,
    keyCount: -1
  };
};

// Layouts references to these constants to define keys
exports.BASIC_LAYOUT = LayoutManager.prototype.KEYCODE_BASIC_LAYOUT;
exports.ALTERNATE_LAYOUT = LayoutManager.prototype.KEYCODE_ALTERNATE_LAYOUT;
exports.SWITCH_KEYBOARD = LayoutManager.prototype.KEYCODE_SWITCH_KEYBOARD;
exports.TOGGLE_CANDIDATE_PANEL =
  LayoutManager.prototype.KEYCODE_TOGGLE_CANDIDATE_PANEL;

// IMEngines rely on this constant to understand the current layout page;
// We'll set it to non-zero to tell it you are not on the default page.
exports.LAYOUT_PAGE_DEFAULT = LayoutManager.prototype.LAYOUT_PAGE_DEFAULT;

exports.LayoutManager = LayoutManager;

})(window);
