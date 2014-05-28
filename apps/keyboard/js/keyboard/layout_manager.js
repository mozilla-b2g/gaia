'use strict';

/* global Promise, KeyboardEvent, KeyEvent */

/** @fileoverview These are special keyboard layouts.
 * Language-specific layouts are in individual js files in layouts/ .
 */

(function(exports) {

// Keyboard layouts register themselves in this object, for now.
var Keyboards = {};

Keyboards.alternateLayout = {
  alt: {
    '0': 'º',
    '$': '€ £ ¥ R$',
    '?': '¿',
    '!': '¡'
  },
  keys: [
    [
      { value: '1' }, { value: '2' }, { value: '3' }, { value: '4' },
      { value: '5' }, { value: '6' }, { value: '7' }, { value: '8' },
      { value: '9' }, { value: '0' }
    ], [
      { value: '@', hidden: ['email'] }, { value: '#' }, { value: '$' },
      { value: '%' },
      { value: '&' }, { value: '*' }, { value: '-' }, { value: '+' },
      { value: '(' }, { value: ')' }, { value: '_', visible: ['email'] }
    ], [
      { value: 'ALT', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
      { value: '!' }, { value: '\"' }, { value: '\'' }, { value: ':' },
      { value: ';' }, { value: '/' }, { value: '?' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards.symbolLayout = {
  keys: [
    [
      { value: '`' }, { value: '~' }, { value: '_' }, { value: '^' },
      { value: '±' }, { value: '|' }, { value: '[' }, { value: ']' },
      { value: '{' }, { value: '}' }
    ], [
      { value: '°' }, { value: '²' }, { value: '³' }, { value: '©' },
      { value: '®' }, { value: '§' }, { value: '<' }, { value: '>' },
      { value: '«' }, { value: '»' }
    ], [
      { value: 'ALT', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
      { value: '¥' }, { value: '€' }, { value: '£' }, { value: '$' },
      { value: '¢' }, { value: '\\' }, { value: '=' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards.numberLayout = {
  width: 9,
  keyClassName: 'big-key special-key',
  keys: [
    [{ value: '1', ratio: 3},{ value: '2', ratio: 3},{ value: '3', ratio: 3}],
    [{ value: '4', ratio: 3},{ value: '5', ratio: 3},{ value: '6', ratio: 3}],
    [{ value: '7', ratio: 3},{ value: '8', ratio: 3},{ value: '9', ratio: 3}],
    [
      { value: '.', ratio: 3, altNote: ','},
      { value: '0', ratio: 3, altNote: '-'},
      { value: '⌫', ratio: 3, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ]
  ],
  alt: {
    '.' : ',',
    '0' : '-'
  }
};

Keyboards.pinLayout = {
  width: 9,
  keyClassName: 'big-key special-key',
  keys: [
    [{ value: '1', ratio: 3},{ value: '2', ratio: 3},{ value: '3', ratio: 3}],
    [{ value: '4', ratio: 3},{ value: '5', ratio: 3},{ value: '6', ratio: 3}],
    [{ value: '7', ratio: 3},{ value: '8', ratio: 3},{ value: '9', ratio: 3}],
    [
      { value: '', ratio: 3},
      { value: '0', ratio: 3},
      { value: '⌫', ratio: 3, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ]
  ]
};

Keyboards.telLayout = {
  width: 9,
  keyClassName: 'big-key special-key',
  keys: [
    [{ value: '1', ratio: 3},{ value: '2', ratio: 3},{ value: '3', ratio: 3}],
    [{ value: '4', ratio: 3},{ value: '5', ratio: 3},{ value: '6', ratio: 3}],
    [{ value: '7', ratio: 3, altNote: '#'},
     { value: '8', ratio: 3, altNote: '-'},
     { value: '9', ratio: 3, altNote: '*'}],
    [{ value: '(', ratio: 3, altNote: ')'},
     { value: '0', ratio: 3, altNote: '+'},
     { value: '⌫', ratio: 3, keyCode: KeyEvent.DOM_VK_BACK_SPACE }]
  ],
  alt: {
    '7' : '#',
    '8' : '-',
    '9' : '*',
    '(' : ')',
    '0' : '+'
  }
};

var LayoutLoader = function() {
};

LayoutLoader.prototype.SOURCE_DIR = './js/layouts/';

LayoutLoader.prototype.start = function() {
  this._initializedLayouts = {};
  this._layoutsPromises = {};
  this.initPreloadedLayouts();
};

LayoutLoader.prototype.initPreloadedLayouts = function() {
  var layoutName;
  var Keyboards = exports.Keyboards;
  for (layoutName in Keyboards) {
    this.initLayout(layoutName);
    this._layoutsPromises[layoutName] =
      Promise.resolve(this._initializedLayouts[layoutName]);
  }
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
      this.initLayout(layoutName);
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

LayoutLoader.prototype.initLayout = function(layoutName) {
  var Keyboards = exports.Keyboards;
  if (!(layoutName in Keyboards)) {
    throw new Error('LayoutLoader: ' + layoutName +
      ' did not expose itself correctly.');
  }

  var layout = Keyboards[layoutName];
  this._initializedLayouts[layoutName] = layout;
  Keyboards[layoutName] = null;
};

// Expose Keyboards object
exports.Keyboards = Keyboards;

exports.LayoutLoader = LayoutLoader;

})(window);
