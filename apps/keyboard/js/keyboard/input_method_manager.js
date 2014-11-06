'use strict';

/* global IMEngineSettings, Promise, KeyEvent */

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
 *    activate(language, inputData, options):
 *      The keyboard calls this method when it becomes active.
 *      language is the current language. inputData is an object
 *      that holds the infomation of the input field or textarea
 *      being typed into. it includes type, inputmode, value,
 *      inputContext and selectionStart, selectionEnd attributes.
 *      options is also an object, it includes suggest, correct,
 *      layoutName attributes. suggest specifies whether the user
 *      wants word suggestions and correct specifies whether auto
 *      correct user's spelling mistakes, and layoutName is used
 *      for handwriting input methods only.
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
 *    sendStrokePoints(strokePoints):
 *      (optional) Send stroke points to handwriting input method engine.
 *      Only handwrting input methods use it.
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
 *    setLayoutPage():
 *      Allows the IM to switch between default and symbol layouts on the
 *      keyboard. Used by the latin IM.
 *
 *    setUpperCase(state):
 *      Allows the IM to switch between uppercase and lowercase layout on the
 *      keyboard. Used by the latin IM.
 *        - state.isUpperCase: to enable the upper case or not.
 *        - state.isUpperCaseLocked: to change the caps lock state.
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
  this.app.console.trace();
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call sendCandidates() when ' +
      'inputContext does not exist.');
    return;
  }
  this.app.candidatePanelManager.updateCandidates(candidates);
};

InputMethodGlue.prototype.setComposition = function(symbols, cursor) {
  this.app.console.trace();
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call setComposition() when ' +
      'inputContext does not exist.');
    return;
  }
  cursor = cursor || symbols.length;
  this.app.console.info('inputContext.setComposition()');
  this.app.inputContext.setComposition(symbols, cursor).catch(function(e) {
    console.warn('InputMethodGlue: setComposition() rejected with error', e);
    this.app.console.log(symbols, cursor);

    return Promise.reject(e);
  }.bind(this));
};

InputMethodGlue.prototype.endComposition = function(text) {
  this.app.console.trace();
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call endComposition() when ' +
      'inputContext does not exist.');
    return;
  }
  text = text || '';
  this.app.console.info('inputContext.endComposition()');
  return this.app.inputContext.endComposition(text).catch(function(e) {
    console.warn('InputMethodGlue: endComposition() rejected with error', e);
    this.app.console.log(text);

    return Promise.reject(e);
  }.bind(this));
};

InputMethodGlue.prototype.sendKey = function(keyCode, isRepeat) {
  this.app.console.trace();
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call sendKey() when ' +
      'inputContext does not exist.');
    return Promise.reject();
  }

  var promise;

  this.app.console.info('inputContext.sendKey()');
  switch (keyCode) {
    case KeyEvent.DOM_VK_BACK_SPACE:
      promise = this.app.inputContext.sendKey(keyCode, 0, 0, isRepeat);
      break;

    case KeyEvent.DOM_VK_RETURN:
      promise = this.app.inputContext.sendKey(keyCode, 0, 0);
      break;

    default:
      promise = this.app.inputContext.sendKey(0, keyCode, 0);
      break;
  }

  return promise.catch(function(e) {
    console.warn('InputMethodGlue: sendKey() rejected with error', e);
    this.app.console.log(keyCode, isRepeat);

    return Promise.reject(e);
  }.bind(this));
};

// XXX deprecated
InputMethodGlue.prototype.sendString = function(str) {
  this.app.console.trace();
  for (var i = 0; i < str.length; i++) {
    this.sendKey(str.charCodeAt(i));
  }
};

InputMethodGlue.prototype.setLayoutPage = function(newpage) {
  this.app.console.trace();
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call setLayoutPage() when ' +
      'inputContext does not exist.');
    return;
  }
  if (newpage !== this.app.layoutManager.PAGE_INDEX_DEFAULT) {
    throw new Error('InputMethodGlue: ' +
      'imEngine is only allowed to switch to default page');
  }
  this.app.setLayoutPage(newpage);
};

InputMethodGlue.prototype.setUpperCase = function(state) {
  this.app.console.trace();
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call setUpperCase() when ' +
      'inputContext does not exist.');
    return;
  }
  this.app.upperCaseStateManager.switchUpperCaseState(state);
};

InputMethodGlue.prototype.isCapitalized = function() {
  this.app.console.trace();
  return this.app.upperCaseStateManager.isUpperCase;
};

InputMethodGlue.prototype.replaceSurroundingText = function(text, offset,
                                                            length) {
  this.app.console.trace();

  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call replaceSurroundingText() when ' +
      'inputContext does not exist.');
    return Promise.reject();
  }

  this.app.console.info('inputContext.replaceSurroundingText()');
  var p = this.app.inputContext.replaceSurroundingText(text, offset, length);
  p.catch(function(e) {
    console.warn('InputMethodGlue: ' +
      'replaceSurroundingText() rejected with error', e);
    this.app.console.log(text, offset, length);

    return Promise.reject(e);
  }.bind(this));

  return p;
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

  this.imEngineSettings = new IMEngineSettings();
  this.imEngineSettings.promiseManager = this.app.settingsPromiseManager;
  this.imEngineSettings.initSettings().catch(function rejected() {
    console.error('Fatal Error! Failed to get initial imEngine settings.');
  });

  this.currentIMEngine = this.loader.getInputMethod('default');
  this._inputContextData = null;
};

/*
 * When the inputcontext is ready, the layout might not be ready yet so it's
 * not known which IMEngine we should switch to.
 * However, before that, updateInputContextData() can be called to update
 * the data needs to activate the IMEngine.
 */
InputMethodManager.prototype.updateInputContextData = function() {
  this.app.console.log('InputMethodManager.updateInputContextData()');
  // Do nothing if there is already a promise or there is no inputContext
  if (!this.app.inputContext) {
    return;
  }

  // Save inputContext as a local variable;
  // It is important that the promise is getting the inputContext
  // it calls getText() on when resolved/rejected.
  var inputContext = this.app.inputContext;

  var p = inputContext.getText().then(function(value) {
    this.app.console.log('updateInputContextData:promise resolved');

    // Resolve to this object containing information of inputContext
    return {
      type: inputContext.inputType,
      inputmode: inputContext.inputMode,
      selectionStart: inputContext.selectionStart,
      selectionEnd: inputContext.selectionEnd,
      value: value
    };
  }.bind(this), function(error) {
    console.warn('InputMethodManager: inputcontext.getText() was rejected.');

    // Resolve to this object containing information of inputContext
    // With empty string as value.
    return {
      type: inputContext.inputType,
      inputmode: inputContext.inputMode,
      selectionStart: inputContext.selectionStart,
      selectionEnd: inputContext.selectionEnd,
      value: ''
    };
  }.bind(this));

  this._inputContextData = p;
};

/*
 * Switch switchCurrentIMEngine() will switch the current method to the
 * desired IMEngine.
 *
 * This method returns a promise.
 * Before the promise resolves (when the IM is active), the currentIMEngine
 * will be the default IMEngine so we won't block keyboard rendering.
 *
 */
InputMethodManager.prototype.switchCurrentIMEngine = function(imEngineName) {
  this.app.console.log(
    'InputMethodManager.switchCurrentIMEngine()', imEngineName);

  // dataPromise is the one we previously created with updateInputContextData()
  var dataPromise = this._inputContextData;

  if (!dataPromise && imEngineName !== 'default') {
    console.warn('InputMethodManager: switchCurrentIMEngine() called ' +
      'without calling updateInputContextData() first.');
  }

  // Deactivate and switch the currentIMEngine to 'default' first.
  if (this.currentIMEngine && this.currentIMEngine.deactivate) {
    this.app.console.log(
      'InputMethodManager::currentIMEngine.deactivate()');
    this.currentIMEngine.deactivate();
  }
  if (this.app.inputContext) {
    this.app.inputContext.removeEventListener('selectionchange', this);
    this.app.inputContext.removeEventListener('surroundingtextchange', this);
  }
  this.currentIMEngine = this.loader.getInputMethod('default');

  // Create our own promise by resolving promise from loader and the passed
  // dataPromise, then do our things.
  var loaderPromise = this.loader.getInputMethodAsync(imEngineName);
  var settingsPromise = this.imEngineSettings.initSettings();

  var p = Promise.all([loaderPromise, dataPromise, settingsPromise])
  .then(function(values) {
    var imEngine = values[0];
    if (typeof imEngine.activate === 'function') {
      var dataValues = values[1];
      var settingsValues = values[2];
      var currentPage = this.app.layoutManager.currentPage;
      var lang = this.app.layoutManager.currentPage.autoCorrectLanguage ||
                 this.app.layoutManager.currentPage.handwritingLanguage;
      var correctPunctuation =
        'autoCorrectPunctuation' in currentPage ?
          currentPage.autoCorrectPunctuation :
          true;

      this.app.console.log(
        'InputMethodManager::currentIMEngine.activate()');
      imEngine.activate(lang, dataValues, {
        suggest: settingsValues.suggestionsEnabled,
        correct: settingsValues.correctionsEnabled,
        correctPunctuation: correctPunctuation
      });
    }

    if (typeof imEngine.selectionChange === 'function') {
      this.app.inputContext.addEventListener('selectionchange', this);
    }

    if (typeof imEngine.surroundingtextChange === 'function') {
      this.app.inputContext.addEventListener('surroundingtextchange', this);
    }
    this.currentIMEngine = imEngine;

    // Unset the used promise so it will get filled when
    // updateInputContextData() is called.
    this._inputContextData = null;
  }.bind(this));

  return p;
};

InputMethodManager.prototype.handleEvent = function(evt) {
  this.app.console.info('InputMethodManager.handleEvent()', evt);
  switch (evt.type) {
    case 'selectionchange':
      this.app.console.log(
        'InputMethodManager::currentIMEngine.selectionChange()', evt.detail);
      this.currentIMEngine.selectionChange(evt.detail);

      break;

    case 'surroundingtextchange':
      this.app.console.log(
        'InputMethodManager::currentIMEngine.surroundingtextChange()',
        evt.detail);
      this.currentIMEngine.surroundingtextChange(evt.detail);

      break;
  }
};

// InputMethod modules register themselves in this object, for now.
exports.InputMethods = InputMethods;

exports.InputMethodGlue = InputMethodGlue;
exports.InputMethodLoader = InputMethodLoader;
exports.InputMethodManager = InputMethodManager;

})(window);
