'use strict';

/* global Promise */

/*
 * InputMethodManager manages life cycle of input methods.
 *
 * These input methods should have lived in their own worker scopes eventually,
 * (they loads their own workers currently any way), however we still loads them
 * into the main loop now, so it is given the opportunity to provide sync
 * feedback.
 *
 * ## Input methods
 *
 * Input methods are in subdirectories of imes/.  The latin input method
 * in imes/latin/ provides word suggestions, auto capitalization, and
 * punctuation assistance.
 *
 * Each input method implements the following interface which the keyboard
 * uses to communicate with it. init() and click() are the only two required
 * methods; the keyboard checks that other methods are defined before
 * invoking them:
 *
 *    init(keyboard):
 *      Keyboard is the object that the IM uses to communicate with the keyboard
 *
 *    activate(language, suggestionsEnabled, inputstate):
 *      The keyboard calls this method when it becomes active.
 *      language is the current language.  suggestionsEnabled
 *      specifies whether the user wants word suggestions inputstate
 *      is an object that holds the state of the input field or
 *      textarea being typed into.  it includes content, cursor
 *      position and type and inputmode attributes.
 *
 *    deactivate():
 *      Called when the keyboard is hidden.
 *
 *    empty:
 *      Clear any currently displayed candidates/suggestions.
 *      The latin input method does not use this, and it is not clear
 *      to me whether the Asian IMs need it either.
 *
 *    click(keycode, x, y):
 *      This is the main method: the keyboard calls this each time the
 *      user taps a key. The keyboard does not actually generate any
 *      key events until the input method tells it to. The x and y coordinate
 *      arguments can be used to improve the IM's word suggestions, in
 *      conjunction with the layout data from setLayoutParams().
 *      The coordinates aren't passed for the Backspace key, however.
 *
 *    select(word, data):
 *      Called when the user selects a displayed candidate or word suggestion.
 *
 *    setLayoutParams(params):
 *      Gives the IM information about the onscreen coordinates of
 *      each key. Used with latin IM only.  Can be used with click
 *      coordinates to improve predictions, but it may not currently
 *      be used.
 *
 *    getMoreCandidates(indicator, maxCount, callback):
 *      (optional) Called when the render needs more candidates to show on the
 *      candidate panel.
 *
 * The init method of each IM is passed an object that it uses to
 * communicate with the keyboard. That interface object defines the following
 * properties and methods:
 *
 *    path:
 *      A url that the IM can use to load dictionaries or other resources
 *
 *    sendCandidates(candidates):
 *      A method that makes the keyboard display candidates or suggestions
 *
 *    setComposition(symbols, cursor):
 *      Set current composing text. This method will start composition or update
 *      composition if it has started.
 *
 *    endComposition(text):
 *      End composition, clear the composing text and commit given text to
 *      current input field.
 *
 *    sendKey(keycode, isRepeat):
 *      Generate output. Typically the keyboard will just pass this
 *      keycode to inputcontext.sendKey(). The IM could call
 *      inputcontext.sendKey() directly, but doing it this way allows
 *      us to chain IMs, I think.
 *
 *    sendString(str):
 *      Outputs a string of text by repeated calls to sendKey().
 *
 *    alterKeyboard(layout):
 *      Allows the IM to modify the keyboard layout by specifying a new layout
 *      name. Only used by asian ims currently.
 *
 *    setLayoutPage():
 *      Allows the IM to switch between default and symbol layouts on the
 *      keyboard. Used by the latin IM.
 *
 *    setUpperCase(upperCase, upperCaseLocked):
 *      Allows the IM to switch between uppercase and lowercase layout on the
 *      keyboard. Used by the latin IM.
 *        - upperCase: to enable the upper case or not.
 *        - upperCaseLocked: to change the caps lock state.
 *
 *    resetUpperCase():
 *      Allows the IM to reset the upperCase to lowerCase without knowing the
 *      internal states like caps lock and current layout page while keeping
 *      setUpperCase simple as it is.
 *
 *    getNumberOfCandidatesPerRow():
 *      Allow the IM to know how many candidates the Render need in one row so
 *      the IM can reduce search time and run the remaining process when
 *      "getMoreCandidates" is called.
 *
 */

(function(exports) {

// InputMethod modules register themselves in this object, for now.
var InputMethods = {};

// The default input method is trivial: when the keyboard passes a key
// to it, it just sends that key right back. Real input methods implement
// a number of other methods.
InputMethods['default'] = {
  init: function(glue) {
    this._glue = glue;
  },
  click: function(keyCode, isRepeat) {
    this._glue.sendKey(keyCode, isRepeat);
  },
  displaysCandidates: function() {
    return false;
  }
};

var InputMethodGlue = function InputMethodGlue() {
  this.app = null;
};

InputMethodGlue.prototype.SOURCE_DIR = './js/imes/';

InputMethodGlue.prototype.init = function(app, imEngineName) {
  this.app = app;
  this.path = this.SOURCE_DIR + imEngineName;
};

InputMethodGlue.prototype.sendCandidates = function(candidates) {
  this.app.sendCandidates(candidates);
};

InputMethodGlue.prototype.setComposition = function(symbols, cursor) {
  this.app.setComposition(symbols, cursor);
};

InputMethodGlue.prototype.endComposition = function(text) {
  this.app.endComposition(text);
};

InputMethodGlue.prototype.sendKey = function(keyCode, isRepeat) {
  return this.app.sendKey(keyCode, isRepeat);
};

// XXX deprecated
InputMethodGlue.prototype.sendString = function(str) {
  for (var i = 0; i < str.length; i++) {
    this.app.sendKey(str.charCodeAt(i));
  }
};

InputMethodGlue.prototype.alterKeyboard = function(keyboard) {
  this.app.alterKeyboard(keyboard);
};

InputMethodGlue.prototype.setLayoutPage = function(newpage) {
  this.app.setLayoutPage(newpage);
};

InputMethodGlue.prototype.setUpperCase = function(upperCase, upperCaseLocked) {
  this.app.setUpperCase(upperCase, upperCaseLocked);
};
InputMethodGlue.prototype.resetUpperCase = function() {
  this.app.resetUpperCase();
};
InputMethodGlue.prototype.replaceSurroundingText = function(text, offset,
                                                            length) {
  return this.app.replaceSurroundingText(text, offset, length);
};
InputMethodGlue.prototype.getNumberOfCandidatesPerRow = function() {
  return this.app.getNumberOfCandidatesPerRow();
};

var InputMethodLoader = function(app) {
  this.app = app;
};

InputMethodLoader.prototype.SOURCE_DIR = './js/imes/';

InputMethodLoader.prototype.start = function() {
  this._initializedIMEngines = {};
  this._imEnginesPromises = {};
  this.initPreloadedInputMethod();
};

InputMethodLoader.prototype.initPreloadedInputMethod = function() {
  var imEngineName;
  var InputMethods = exports.InputMethods;
  for (imEngineName in InputMethods) {
    this.initInputMethod(imEngineName);
    this._imEnginesPromises[imEngineName] =
      Promise.resolve(this._initializedIMEngines[imEngineName]);
  }
};

InputMethodLoader.prototype.getInputMethod = function(imEngineName) {
  return this._initializedIMEngines[imEngineName];
};

// This method returns a promise and resolves when the IMEngine script
// is loaded.
InputMethodLoader.prototype.getInputMethodAsync = function(imEngineName) {
  if (this._imEnginesPromises[imEngineName]) {
    return this._imEnginesPromises[imEngineName];
  }

  var p = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.onload = function() {
      this.initInputMethod(imEngineName);
      resolve(this._initializedIMEngines[imEngineName]);
    }.bind(this);
    script.onerror = function() {
      this._imEnginesPromises[imEngineName] = null;
      console.error('InputMethodLoader: unable to load ' + imEngineName + '.');
      reject();
    }.bind(this);
    script.src = this.SOURCE_DIR + imEngineName + '/' + imEngineName + '.js';
    document.body.appendChild(script);
  }.bind(this));

  this._imEnginesPromises[imEngineName] = p;
  return p;
};

InputMethodLoader.prototype.initInputMethod = function(imEngineName) {
  var InputMethods = exports.InputMethods;
  if (!(imEngineName in InputMethods)) {
    throw new Error('InputMethodLoader: ' + imEngineName +
      ' did not expose itself correctly.');
  }

  var imEngine = InputMethods[imEngineName];
  var glue = new InputMethodGlue();
  glue.init(this.app, imEngineName);

  this._initializedIMEngines[imEngineName] = InputMethods[imEngineName];
  InputMethods[imEngineName] = null;

  imEngine.init(glue);
};

var InputMethodManager = function InputMethodManager(app) {
  this._targetIMEngineName = null;
  this.currentIMEngine = null;
  this.app = app;
};

InputMethodManager.prototype.start = function() {
  this.loader = new InputMethodLoader(this.app);
  this.loader.start();

  this.currentIMEngine = this.loader.getInputMethod('default');

  this._switchStateId = 0;
};

/*
 * Switch switchCurrentIMEngine() will switch the current method to the
 * desired IMEngine.
 *
 * This method returns a promise.
 * Before the promise resolves (when the IM is active), the currentIMEngine
 * will be the default IMEngine so we won't block keyboard rendering.
 *
 * The actual IMEngine will not be switched and activated until dataPromise
 * resolves, if it has an activate method.
 *
 */
InputMethodManager.prototype.switchCurrentIMEngine = function(imEngineName,
                                                              dataPromise) {
  var switchStateId = ++this._switchStateId;

  dataPromise = dataPromise || Promise.resolve();
  // Deactivate and switch the currentIMEngine to 'default' first.
  if (this.currentIMEngine && this.currentIMEngine.deactivate) {
    this.currentIMEngine.deactivate();
  }
  this.currentIMEngine = this.loader.getInputMethod('default');

  // Create our own promise by resolving promise from loader and the passed
  // dataPromise, then do our things.
  var loaderPromise = this.loader.getInputMethodAsync(imEngineName);

  var p = Promise.all([loaderPromise, dataPromise]).then(function(values) {
    if (switchStateId !== this._switchStateId) {
      console.log('InputMethodManager: ' +
        'Promise is resolved after another switchCurrentIMEngine() call. ' +
        'Reject the promise instead.');

      return Promise.reject(new Error(
        'InputMethodManager: switchCurrentIMEngine() is called again before ' +
        'resolving.'));
    }

    var imEngine = values[0];
    var dataValues = values[1];

    if (typeof imEngine.activate === 'function') {
      imEngine.activate.apply(imEngine, dataValues);
    }
    this.currentIMEngine = imEngine;

    // resolve to undefined
    return;
  }.bind(this), function(error) {
    return Promise.reject(error);
  }.bind(this));

  return p;
};

// InputMethod modules register themselves in this object, for now.
exports.InputMethods = InputMethods;

exports.InputMethodGlue = InputMethodGlue;
exports.InputMethodLoader = InputMethodLoader;
exports.InputMethodManager = InputMethodManager;

})(window);
