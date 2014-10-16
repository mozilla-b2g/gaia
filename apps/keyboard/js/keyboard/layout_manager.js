'use strict';

/* global KeyboardEvent, LayoutLoader, Promise */

/** @fileoverview These are special keyboard layouts.
 * Language-specific layouts are in individual js files in layouts/ .
 */

(function(exports) {

/**
 * LayoutManager do one and only simply job: Allow you to switch currentPage,
 * tell you when it is ready, and give you access to it.
 * @class
 * @param {Object} app the keyboard app instance
 */
var LayoutManager = function(app) {
  this.app = app;

  // When the layout is loaded, it's name is put here.
  // We won't necessary use it since we might be using a type-specific layout
  // for the layout page.
  this._typeGenericLayoutName = undefined;

  // currentPage is the layout definition needed according to
  // the current input mode and the layout page.
  // It's always an object with "modifications" of it's prototype parent, i.e.
  // the page prototype of the layout used.
  this.currentPage = null;
  this.currentPageIndex = this.PAGE_INDEX_DEFAULT;
};

LayoutManager.prototype.start = function() {
  this.loader = new LayoutLoader();
  this.loader.start();

  this._switchStateId = 0;
};

// Special key codes on special buttons
LayoutManager.prototype.KEYCODE_SWITCH_KEYBOARD = -3;
LayoutManager.prototype.KEYCODE_TOGGLE_CANDIDATE_PANEL = -4;

LayoutManager.prototype.DEFAULT_LAYOUT_NAME = 'defaultLayout';
LayoutManager.prototype.PAGE_INDEX_DEFAULT = 0;

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

    this._typeGenericLayoutName = layoutName;
    this.currentPageIndex = this.PAGE_INDEX_DEFAULT;

    this._updateCurrentPage();
  }.bind(this));

  return p;
};

/*
 * Layout page refer to alternative/symbol layout of the current layout.
 * It will be the default alternative/symbol layout if the current layout
 * does not overwrite them.
 *
 * This function keep the information in currentPageIndex and
 * update the specific layout to currentPage.
 *
 */
LayoutManager.prototype.updateLayoutPage = function(page) {
  this.currentPageIndex = page;
  this._updateCurrentPage();
};

/*
 * This function decide which layout to use, load it, and makes an empty object
 * with prototype points to the page to use, and then modifies it to add
 * meta keys for switching languages and switching to numbers and symbols.
 * It may also add keys (like a "/" and '@') that are specific to input
 * of basic input type.
 *
 * The result is saved to currentPage.
 */
LayoutManager.prototype._updateCurrentPage = function() {
  // If there isn't an inputContext or there is no typeGenericLayoutName,
  // clean up modified layout.
  if (!this.app.inputContext || !this._typeGenericLayoutName) {
    console.warn('LayoutManager: ' +
      'calling _updateCurrentPage() when there is no ' +
      'inputContext or _typeGenericLayoutName.');

    this.currentPage = null;
    return;
  }

  // These are external information we need outside of our own module
  // to generate the new modified layout.
  var inputMode = this.app.inputContext.inputMode;
  var basicInputType = this.app.getBasicInputType();
  var supportsSwitching = this.app.supportsSwitching();

  // It's possible we should point to a type-specific layout,
  // instead of typeGenericLayoutName.
  var typeSpecificLayoutName =
    this._typeSpecificLayoutName(basicInputType, inputMode);

  var layout = this.loader.getLayout(typeSpecificLayoutName ||
                                     this._typeGenericLayoutName);

  if (!layout) {
    console.error(
      'LayoutManager: Can\'t load the layout.',
      'typeSpecificLayoutName=', typeSpecificLayoutName,
      'typeGenericLayoutName=', this._typeGenericLayoutName,
      'currentPageIndex=', this.currentPageIndex);

    this.currentPage = null;
    return;
  }

  var page = layout.pages[this.currentPageIndex];
  if (!page) {
    var defaultLayout = this.loader.getLayout(this.DEFAULT_LAYOUT_NAME);
    page = defaultLayout.pages[this.currentPageIndex];
  }

  if (!page) {
    console.error(
      'LayoutManager: Can\'t load the page from layout.',
      'typeSpecificLayoutName=', typeSpecificLayoutName,
      'typeGenericLayoutName=', this._typeGenericLayoutName,
      'currentPageIndex=', this.currentPageIndex);

    this.currentPage = null;
    return;
  }

  // Create an empty object with prototype point to the original one
  // to prevent from modifying it.
  page = this.currentPage = Object.create(page);

  // These properties needs to be carry over to the page from the layout
  // regardless where the page is come from.
  ['imEngine', 'autoCorrectLanguage',
    'autoCorrectPunctuation', 'needsCandidatePanel'
  ].forEach(function(prop) {
    if (prop in layout) {
      page[prop] = layout[prop];
    }
  });

  // render.js need these information to cache the DOM tree.
  // StateManager need to upload this to mozSettings DB
  page.layoutName = typeSpecificLayoutName || this._typeGenericLayoutName;
  page.pageIndex = this.currentPageIndex;

  // Look for the space key in the page. We're going to insert
  // meta keys before it or after it.
  var spaceKeyFindResult = this._findKey(page, KeyboardEvent.DOM_VK_SPACE);
  var spaceKeyRowCount = spaceKeyFindResult.keyRowCount;
  var spaceKeyCount = spaceKeyFindResult.keyCount;

  if (!spaceKeyFindResult.keyFound) {
    console.warn('LayoutManager:' +
      'No space key found. No special keys will be added.');

    return;
  }

  // We are going to modify the keys array, spaceKeyRow array and the space key
  // itself, so these arrays must be re-created and object must be replaced with
  // an empty one.
  //
  // ... make a copy of the entire keys array,
  page.keys = [].concat(page.keys);
  var copiedRows = [];
  // ... and point row containing space key object to a new array,
  var spaceKeyRow = page.keys[spaceKeyRowCount] =
    [].concat(page.keys[spaceKeyRowCount]);
  copiedRows.push(spaceKeyRowCount);
  // ... the space key object should be point to a new object too.
  var spaceKeyObject = page.keys[spaceKeyRowCount][spaceKeyCount] =
    Object.create(page.keys[spaceKeyRowCount][spaceKeyCount]);

  var enterKeyFindResult = this._findKey(page, KeyboardEvent.DOM_VK_RETURN);
  var enterKeyCount = enterKeyFindResult.keyCount;
  // Assume the [Enter] is at the same row as the space key
  var enterKeyObject = page.keys[spaceKeyRowCount][enterKeyCount] =
    Object.create(page.keys[spaceKeyRowCount][enterKeyCount]);

  // Keep the pageSwitchingKey here, because we may need to modify its ratio
  // at the end.
  var pageSwitchingKeyObject = null;

  // Insert switch-to-symbol-and-back keys
  if (!layout.disableAlternateLayout) {
    spaceKeyObject.ratio -= 2;
    if (this.currentPageIndex === this.PAGE_INDEX_DEFAULT) {
      pageSwitchingKeyObject = {
        keyCode: KeyboardEvent.DOM_VK_ALT,
        value: layout.alternateLayoutKey || '12&',
        uppercaseValue: layout.alternateLayoutKey || '12&',
        ratio: 2,
        ariaLabel: 'alternateLayoutKey',
        className: 'page-switch-key',
        targetPage: 1,
        isSpecialKey: true
      };
    } else {
      pageSwitchingKeyObject = {
        keyCode: KeyboardEvent.DOM_VK_ALT,
        value: layout.basicLayoutKey || 'ABC',
        uppercaseValue: layout.basicLayoutKey || 'ABC',
        ratio: 2,
        ariaLabel: 'basicLayoutKey',
        className: 'page-switch-key',
        targetPage: this.PAGE_INDEX_DEFAULT,
        isSpecialKey: true
      };
    }

    // XXX: pageSwitchingKeyObject may be modified later,
    // so not freezing it here
    spaceKeyRow.splice(spaceKeyCount, 0, pageSwitchingKeyObject);
    spaceKeyCount++;
    enterKeyCount++;
  }

  // Insert switch-to-another-layout button
  var needsSwitchingKey = supportsSwitching && !layout.hidesSwitchKey;
  if (needsSwitchingKey) {
    var imeSwitchKey = {
      value: '&#x1f310;', // U+1F310 GLOBE WITH MERIDIANS
      uppercaseValue: '&#x1f310;',
      keyCode: this.KEYCODE_SWITCH_KEYBOARD,
      className: 'switch-key',
      isSpecialKey: true
    };

    // Replace the label with short label if there is one
    if (layout.shortLabel) {
      imeSwitchKey.value = layout.shortLabel;
      imeSwitchKey.uppercaseValue = layout.shortLabel;
      imeSwitchKey.className += ' alternate-indicator';
    }

    spaceKeyObject.ratio -= 1;
    spaceKeyRow.splice(spaceKeyCount, 0, Object.freeze(imeSwitchKey));
    spaceKeyCount++;
    enterKeyCount++;

    // Replace the key with supportsSwitching alternative defined.
    // This is because we won't have ',' at the bottom, and we would
    // move it to other place.
    var r = page.keys.length, c, row, key;
    while (r--) {
      row = page.keys[r];
      c = row.length;
      while (c--) {
        key = row[c];
        if (key.supportsSwitching) {
          if (copiedRows.indexOf(r) === -1) {
            page.keys[r] = [].concat(page.keys[r]);
            copiedRows.push(r);
          }
          page.keys[r][c] = key.supportsSwitching;
        }
      }
    }
  }

  // Respond to different input types
  if (!page.typeInsensitive) {
    var periodKey = {
      value: '.',
      keyCode: 46,
      keyCodeUpper: 46,
      lowercaseValue: '.',
      uppercaseValue: '.',
      isSpecialKey: false
    };
    if (page.alt && page.alt['.']) {
      periodKey.className = 'alternate-indicator';
    }
    periodKey = Object.freeze(periodKey);


    var modifyType = 'default';
    // We have different rules to handle the default layout page and
    // symbol/alternate page.
    // Only insert special character, such as '@' for email, '/' for url
    // on the default layout page.
    if (this.currentPageIndex === this.PAGE_INDEX_DEFAULT) {
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
        spaceKeyRow.splice(spaceKeyCount, 0, Object.freeze({
          value: '/',
          keyCode: 47,
          keyCodeUpper: 47,
          lowercaseValue: '/',
          uppercaseValue: '/',
          isSpecialKey: false
        }));
        spaceKeyCount++;
        enterKeyCount++;

        // period key (after space key)
        spaceKeyRow.splice(spaceKeyCount + 1, 0, periodKey);
        enterKeyCount++;

        break;

      case 'email':
        spaceKeyObject.ratio -= 2;
        // Add '@' key when we are at the default page
        spaceKeyRow.splice(spaceKeyCount, 0, Object.freeze({
          value: '@',
          keyCode: 64,
          keyCodeUpper: 64,
          lowercaseValue: '@',
          uppercaseValue: '@',
          isSpecialKey: false
        }));
        spaceKeyCount++;
        enterKeyCount++;

        // period key (after space key)
        spaceKeyRow.splice(spaceKeyCount + 1, 0, periodKey);
        enterKeyCount++;

        break;

      case 'search':
        if (enterKeyObject) {
          enterKeyObject.className = 'search-icon';
        }
        // fall through to take modifications from default layouts

      /* falls through */
      case 'default':
        var overwrites = page.textLayoutOverwrite || {};
        // Add comma key if we are asked to,
        // Only add the key if we didn't add the switching key.
        // Add comma key in any page if needsCommaKey is
        // set explicitly.
        if (overwrites[','] !== false &&
            (!needsSwitchingKey || page.needsCommaKey)) {

          var commaKey;

          if (overwrites[',']) {
            commaKey = overwrites[','];
          } else {
            commaKey = Object.freeze({
              value: ',',
              keyCode: 44,
              keyCodeUpper: 44,
              lowercaseValue: ',',
              uppercaseValue: ',',
              isSpecialKey: false
            });
          }

          spaceKeyObject.ratio -= 1;
          spaceKeyRow.splice(spaceKeyCount, 0, commaKey);
          spaceKeyCount++;
          enterKeyCount++;
        }

        // Only add peroid key if we are asked to.
        if (overwrites['.'] !== false) {
          if (overwrites['.']) {
            periodKey = overwrites[','];
          }

          spaceKeyObject.ratio -= 1;
          // peroid key (after space key)
          spaceKeyRow.splice(spaceKeyCount + 1, 0, periodKey);
          enterKeyCount++;
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

  var keyCount = page.width ? page.width : 10;
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

  page.keys[spaceKeyRowCount][enterKeyCount] = Object.freeze(enterKeyObject);
  page.keys[spaceKeyRowCount][spaceKeyCount] = Object.freeze(spaceKeyObject);
};

LayoutManager.prototype._typeSpecificLayoutName = function(basicInputType,
                                                           inputMode) {
  switch (basicInputType) {
    case 'tel':
      return 'telLayout';

    case 'number':
      switch (inputMode) {
        case 'digit':
          return 'pinLayout';

        default:
          return 'numberLayout';
      }

      break;

    // This matches when type="password", "text", or "search",
    // see getBasicInputType() for details
    case 'text':
      switch (inputMode) {
        case 'digit':
          return 'pinLayout';

        case 'numeric':
          return 'numberLayout';

        case '-moz-sms':
          var smsLayoutName = this._typeGenericLayoutName + '-sms';
          if (this.loader.getLayout(smsLayoutName)) {
            return smsLayoutName;
          }
      }

      break;
  }

  // We don't need an type-specific layout name.
  return '';
};

/**
 * Find a key with the specific keyCode in the layout
 * @memberof LayoutManager.prototype
 * @param {Object} page The page object
 * @param {number} keyCode The keyCode we use to match the key
 * @returns {Object} findResult The result of the search
 * @returns {boolean} findResult.keyFound true if the key has been found
 * @returns {number} findResult.keyRowCount the row position of the key
 * @returns {number} findResult.keyCount the position of the key in the row
 */
LayoutManager.prototype._findKey = function(page, keyCode) {
  // Look up from the last row because the key we need to modify, such as
  // the space key and the [Enter] key, are usually
  // at the last row.
  var r = page.keys.length, c, row, key;

  while (r--) {
    row = page.keys[r];
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
exports.SWITCH_KEYBOARD = LayoutManager.prototype.KEYCODE_SWITCH_KEYBOARD;
exports.TOGGLE_CANDIDATE_PANEL =
  LayoutManager.prototype.KEYCODE_TOGGLE_CANDIDATE_PANEL;

// IMEngines rely on this constant to understand the current layout page;
// We'll set it to non-zero to tell it you are not on the default page.
exports.PAGE_INDEX_DEFAULT = LayoutManager.prototype.PAGE_INDEX_DEFAULT;

exports.LayoutManager = LayoutManager;

})(window);
