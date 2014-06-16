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
  width: 3,
  keyClassName: 'big-key special-key',
  keys: [
    [ { value: '1'}, { value: '2'}, { value: '3'} ],
    [ { value: '4'}, { value: '5'}, { value: '6'} ],
    [ { value: '7'}, { value: '8'}, { value: '9'} ],
    [ { value: '.', altNote: ',' },
      { value: '0', altNote: '-' },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE } ]
  ],
  alt: {
    '.' : ',',
    '0' : '-'
  }
};

Keyboards.pinLayout = {
  width: 3,
  keyClassName: 'big-key special-key',
  keys: [
    [ { value: '1'}, { value: '2'}, { value: '3'} ],
    [ { value: '4'}, { value: '5'}, { value: '6'} ],
    [ { value: '7'}, { value: '8'}, { value: '9'} ],
    [ { value: ''}, { value: '0'},
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE } ]
  ]
};

Keyboards.telLayout = {
  width: 3,
  keyClassName: 'big-key special-key',
  keys: [
    [ { value: '1'}, { value: '2'}, { value: '3'} ],
    [ { value: '4'}, { value: '5'}, { value: '6'} ],
    [ { value: '7', altNote: '#'},
      { value: '8', altNote: '-'},
      { value: '9', altNote: '*'} ],
    [ { value: '(', altNote: ')'},
      { value: '0', altNote: '+'},
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE } ]
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

    // Create a promise so that these panels can be loaded async
    // even if they are not loaded with file of their name.
    if (!this._layoutsPromises[layoutName]) {
      this._layoutsPromises[layoutName] =
        Promise.resolve(this._initializedLayouts[layoutName]);
    }
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

/**
 * LayoutManager do one and only simply job: Allow you to switch currentLayout,
 * tell you when it is ready, and give you access to it.
 */
var LayoutManager = function() {
  this.currentLayout = null;
};

LayoutManager.prototype.start = function() {
  this.loader = new LayoutLoader();
  this.loader.start();

  this._switchStateId = 0;
};

/*
 * Switch switchCurrentLayout() will switch the current method to the
 * desired layout.
 *
 * This method returns a promise and it resolves when the layout is ready.
 *
 */
LayoutManager.prototype.switchCurrentLayout = function(layoutName) {
  var switchStateId = ++this._switchStateId;

  var loaderPromise = this.loader.getLayoutAsync(layoutName);

  var p = loaderPromise.then(function(layout) {
    if (switchStateId !== this._switchStateId) {
      console.log('LayoutManager: ' +
        'Promise is resolved after another switchCurrentLayout() call. ' +
        'Reject the promise instead.');

      return Promise.reject(new Error(
        'LayoutManager: switchCurrentLayout() is called again before ' +
        'resolving.'));
    }

    this.currentLayout = layout;

    // resolve to undefined
    return;
  }.bind(this), function(error) {
    return Promise.reject(error);
  }.bind(this));

  return p;
};

// Expose Keyboards object
exports.Keyboards = Keyboards;

exports.LayoutLoader = LayoutLoader;
exports.LayoutManager = LayoutManager;


})(window);
