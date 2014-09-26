'use strict';

/* global Promise, KeyboardEvent */

(function(exports) {

// Keyboard layouts register themselves in this object, for now.
var Keyboards = {};

Keyboards.defaultLayout = {
  pages: [
    { /* The 0th page of the defaultLayout should never be used */ },
    { /* The 1st page, used to be called 'alternateLayout' */
      alt: {
        '1': ['¹'],
        '2': ['²'],
        '3': ['³'],
        '4': ['⁴'],
        '5': ['⁵'],
        '6': ['⁶'],
        '7': ['⁷'],
        '8': ['⁸'],
        '9': ['⁹'],
        '0': ['⁰', 'º'],
        '$': [ '€', '£', '¢', '¥'],
        '"': ['“', '”'],
        '\'':['‘', '’'],
        '?': ['¿'],
        '!': ['¡'],
        '+': ['-', '×', '÷', '±']
      },
      keys: [
        [
          { value: '1' }, { value: '2' }, { value: '3' }, { value: '4' },
          { value: '5' }, { value: '6' }, { value: '7' }, { value: '8' },
          { value: '9' }, { value: '0' }
        ], [
          { value: '@' }, { value: '#' },
          { value: '$', className: 'alternate-indicator' }, { value: '&' },
          { value: '*' }, { value: '-' }, { value: '_' }, { value: '/' },
          { value: '(' }, { value: ')' }
        ], [
          { value: 'Alt', ratio: 1.5,
            keyCode: KeyboardEvent.DOM_VK_ALT,
            className: 'page-switch-key',
            targetPage: 2
          },
          { value: '+',
            supportsSwitching: {
              value: ','
            }
          },
          { value: ':' },
          { value: ';' }, { value: '"' },
          { value: '\'' }, { value: '!' }, { value: '?' },
          { value: '⌫', ratio: 1.5, keyCode: KeyboardEvent.DOM_VK_BACK_SPACE }
        ], [
          { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
          { value: '↵', ratio: 2, keyCode: KeyboardEvent.DOM_VK_RETURN }
        ]
      ]
    },
    { /* The 2nd page, used to be called 'symbolLayout' */
      alt: {
        '+': ['-', '×', '÷', '±'],
        '®': ['™']
      },
      keys: [
        [
          { value: '€' }, { value: '£' }, { value: '¢' }, { value: '¥' },
          { value: '%' }, { value: '©' }, { value: '®' }, { value: '·' },
          { value: '|' }, { value: '\\' }
        ], [
          { value: '~' }, { value: '℃' }, { value: '℉' }, { value: '°' },
          { value: '<' }, { value: '>' }, { value: '[' }, { value: ']' },
          { value: '{' }, { value: '}' }
        ], [
          { value: 'Alt', ratio: 1.5,
            keyCode: KeyboardEvent.DOM_VK_ALT,
            className: 'page-switch-key',
            targetPage: 1
          },
          { value: '+' }, { value: '=' }, { value: '`' },
          { value: '^' }, { value: '§' }, { value: '«'}, {value: '»'},
          { value: '⌫', ratio: 1.5, keyCode: KeyboardEvent.DOM_VK_BACK_SPACE }
        ], [
          { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
          { value: '↵', ratio: 2, keyCode: KeyboardEvent.DOM_VK_RETURN }
        ]
      ]
    }
  ]
};

Keyboards.numberLayout = {
  width: 3,
  keyClassName: 'big-key special-key',
  keys: [
    [ { value: '1'}, { value: '2'}, { value: '3'} ],
    [ { value: '4'}, { value: '5'}, { value: '6'} ],
    [ { value: '7'}, { value: '8'}, { value: '9'} ],
    [ { value: '.', longPressValue: ',' },
      { value: '0', longPressValue: '-' },
      { value: '⌫', keyCode: KeyboardEvent.DOM_VK_BACK_SPACE } ]
  ]
};

Keyboards.pinLayout = {
  width: 3,
  keyClassName: 'big-key special-key bottom-symbol',
  keys: [
    [ { value: '1'}, { value: '2'}, { value: '3'} ],
    [ { value: '4'}, { value: '5'}, { value: '6'} ],
    [ { value: '7'}, { value: '8'}, { value: '9'} ],
    [ { value: ''}, { value: '0'},
      { value: '⌫', keyCode: KeyboardEvent.DOM_VK_BACK_SPACE } ]
  ]
};

Keyboards.telLayout = {
  width: 3,
  keyClassName: 'big-key special-key bottom-symbol',
  keys: [
      [
        { value: '1', longPressValue: '('},
        { value: '2', longPressValue: ')'},
        { value: '3', longPressValue: '/'}
      ],
      [
        { value: '4', longPressValue: '-'},
        { value: '5', longPressValue: '_'},
        { value: '6', longPressValue: ','}
      ],
      [
        { value: '7', longPressValue: ':'},
        { value: '8', longPressValue: '.'},
        { value: '9', longPressValue: ';'}],
      [
        { value: '*', longPressValue: '#'},
        { value: '0', longPressValue: '+'},
        { value: '⌫', keyCode: KeyboardEvent.DOM_VK_BACK_SPACE }
      ]
  ]
};

var LayoutLoader = function() {
};

LayoutLoader.prototype.SOURCE_DIR = './js/layouts/';

LayoutLoader.prototype.start = function() {
  this._initializedLayouts = {};
  this._layoutsPromises = {};
  this.initLayouts();
};

LayoutLoader.prototype.initLayouts = function() {
  // Reset the exposed Keyboards object and collect all layouts
  // in the original one.
  var Keyboards = exports.Keyboards;
  exports.Keyboards = {};
  var layoutName;
  for (layoutName in Keyboards) {
    if (this._initializedLayouts[layoutName]) {
      console.warn('LayoutLoader: ' + layoutName + ' is overwritten.');
    }
    this._initializedLayouts[layoutName] = Keyboards[layoutName];
    this._normalizeLayout(layoutName);

    // Create a promise so that these panels can be loaded async
    // even if they are not loaded with file of their name.
    if (!this._layoutsPromises[layoutName]) {
      this._layoutsPromises[layoutName] =
        Promise.resolve(this._initializedLayouts[layoutName]);
    }
  }
};

// In order to keep the commit log sane, some amendments of the
// layout JS structure are fix here in runtime instead of hardcoded.
// TODO: normalize the layout files and maybe remove this function.
LayoutLoader.prototype._normalizeLayout = function(layoutName) {
  var layout = this.getLayout(layoutName);

  var pages;
  if ('pages' in layout) {
    pages = layout.pages;
  } else {
    pages = layout.pages = [];
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
      if (layout[prop]) {
        pages[0][prop] = layout[prop];
        delete layout[prop];
      }
    });
  }

  // Go through each pages and inspect it's "alt" property;
  // we want to normalize our existing mixed notations into arrays.
  pages.forEach(function(page) {
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
  }, this);
};

LayoutLoader.prototype.getLayout = function(layoutName) {
  return this._initializedLayouts[layoutName];
};

// This method returns a promise and resolves when the IMEngine script
// is loaded.
LayoutLoader.prototype.getLayoutAsync = function(layoutName) {
  if (this._layoutsPromises[layoutName]) {
    return this._layoutsPromises[layoutName];
  }

  var p = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.onload = function() {
      this.initLayouts();
      resolve(this._initializedLayouts[layoutName]);
    }.bind(this);
    script.onerror = function() {
      this._layoutsPromises[layoutName] = null;
      console.error('LayoutLoader: unable to load ' + layoutName + '.');
      reject();
    }.bind(this);
    script.src = this.SOURCE_DIR + layoutName + '.js';
    document.body.appendChild(script);
  }.bind(this));

  this._layoutsPromises[layoutName] = p;
  return p;
};

// Expose Keyboards object
exports.Keyboards = Keyboards;

exports.LayoutLoader = LayoutLoader;

})(window);
