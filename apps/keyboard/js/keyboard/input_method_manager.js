'use strict';

/* global IMEngineSettings, Promise, KeyEvent, HandwritingPadsManager */

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
 *    activate(language, inputData, option):
 *      The keyboard calls this method when it becomes active.
 *      language is the current language. inputData is an object
 *      that holds the infomation of the input field or textarea
 *      being typed into. it includes type, inputmode, value,
 *      inputContext and selectionStart, selectionEnd attributes.
 *      option is also an object, it includes suggest, correct,
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
 *    alterKeyboard(layout):
 *      Allows the IM to modify the keyboard layout by specifying a new layout
 *      name. Only used by asian ims currently.
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
  this.app.candidatePanelManager.updateCandidates(candidates);
};

InputMethodGlue.prototype.setComposition = function(symbols, cursor) {
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call setComposition() when ' +
      'inputContext does not exist.');
    return;
  }
  cursor = cursor || symbols.length;
  this.app.inputContext.setComposition(symbols, cursor);
};

InputMethodGlue.prototype.endComposition = function(text) {
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call endComposition() when ' +
      'inputContext does not exist.');
    return;
  }
  text = text || '';
  this.app.inputContext.endComposition(text);
};

InputMethodGlue.prototype.sendKey = function(keyCode, isRepeat) {
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call sendKey() when ' +
      'inputContext does not exist.');
    return Promise.reject();
  }

  var promise;

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

  return promise;
};

// XXX deprecated
InputMethodGlue.prototype.sendString = function(str) {
  for (var i = 0; i < str.length; i++) {
    this.sendKey(str.charCodeAt(i));
  }
};

// Set the current rendered layout to a specific named layout
// XXX deprecated; overwrite alternative/symbol layout instead.
InputMethodGlue.prototype.alterKeyboard = function(layoutName) {
  this.app.layoutManager.updateForcedModifiedLayout(layoutName);
  this.app.layoutRenderingManager.updateLayoutRendering();
};

InputMethodGlue.prototype.setLayoutPage = function(newpage) {
  if (newpage !== this.app.layoutManager.LAYOUT_PAGE_DEFAULT) {
    throw new Error('InputMethodGlue: ' +
      'imEngine is only allowed to switch to default page');
  }
  this.app.setLayoutPage(newpage);
};

InputMethodGlue.prototype.setUpperCase = function(state) {
  this.app.upperCaseStateManager.switchUpperCaseState(state);
};

InputMethodGlue.prototype.isCapitalized = function() {
  return this.app.upperCaseStateManager.isUpperCase;
};

InputMethodGlue.prototype.replaceSurroundingText = function(text, offset,
                                                            length) {
  if (!this.app.inputContext) {
    console.warn('InputMethodGlue: call replaceSurroundingText() when ' +
      'inputContext does not exist.');
    return Promise.reject();
  }

  return this.app.inputContext.replaceSurroundingText(text, offset, length);
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

  this._switchStateId = 0;
  this._inputContextData = null;
};

/*
 * When the inputcontext is ready, the layout might not be ready yet so it's
 * not known which IMEngine we should switch to.
 * However, before that, updateInputContextData() can be called to update
 * the data needs to activate the IMEngine.
 */
InputMethodManager.prototype.updateInputContextData = function() {
  // Do nothing if there is already a promise or there is no inputContext
  if (!this.app.inputContext || this._inputContextData) {
    return;
  }

  // Save inputContext as a local variable;
  // It is important that the promise is getting the inputContext
  // it calls getText() on when resolved/rejected.
  var inputContext = this.app.inputContext;

  var p = inputContext.getText().then(function(value) {
    this.app.perfTimer.printTime('updateInputContextData:promise resolved');

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
  var switchStateId = ++this._switchStateId;

  // dataPromise is the one we previously created with updateInputContextData()
  var dataPromise = this._inputContextData;

  // Unset the used promise so it will get filled when
  // updateInputContextData() is called.
  this._inputContextData = null;

  if (!dataPromise && imEngineName !== 'default') {
    console.warn('InputMethodManager: switchCurrentIMEngine() called ' +
      'without calling updateInputContextData() first.');
  }

  // Deactivate and switch the currentIMEngine to 'default' first.
  if (this.currentIMEngine && this.currentIMEngine.deactivate) {
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
    if (switchStateId !== this._switchStateId) {
      console.log('InputMethodManager: ' +
        'Promise is resolved after another switchCurrentIMEngine() call.');

      return Promise.reject();
    }

    // If current IM engine is handwriting, start handwrting pads manager.
    if (this.app.layoutManager.currentLayout.handwriting &&
        !this.app.handwritingPadsManager) {
      this.app.handwritingPadsManager = new HandwritingPadsManager(this.app);
      this.app.handwritingPadsManager.start();
    }

    var imEngine = values[0];
    if (typeof imEngine.activate === 'function') {
      var dataValues = values[1];
      var settingsValues = values[2];
      imEngine.activate(
        this.app.layoutManager.currentModifiedLayout.autoCorrectLanguage,
        dataValues,
        {
          suggest: settingsValues.suggestionsEnabled,
          correct: settingsValues.correctionsEnabled,
          layoutName: this.app.layoutManager.currentLayoutName
        }
      );
    }

    if (typeof imEngine.selectionChange === 'function') {
      this.app.inputContext.addEventListener('selectionchange', this);
    }

    if (typeof imEngine.surroundingtextChange === 'function') {
      this.app.inputContext.addEventListener('surroundingtextchange', this);
    }
    this.currentIMEngine = imEngine;
  }.bind(this));

  return p;
};

InputMethodManager.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    case 'selectionchange':
      this.currentIMEngine.selectionChange(evt.detail);

      break;

    case 'surroundingtextchange':
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
