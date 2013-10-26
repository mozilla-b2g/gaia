/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*
 * keyboard.js:
 *
 * This is the main module of the Gaia keyboard app. It does these things:
 *
 * - Hides and shows the keyboard in response to focuschange events from
 *   navigator.mozInputMethod.inputcontext
 *
 * - Loads the input method (from imes/) module required by a keyboard
 *
 * - Handles settings changes for the user's language, keyboard layouts, and
 *   preferences for word suggestions, and updates the keyboard accordingly.
 *
 * - Handles resize events (caused by orientation changes) and updates
 *   the keyboard accordingly.
 *
 * - Handles (using code that was formerly in a separate controller.js module)
 *   mouse events over the keyboard and passes them to the input method.
 *
 * - When the input method sends value back to the keyboard, it turns
 *   them into synthetic key events using the inputmethod API.
 *
 * This module includes code that was formerly in the controller.js and
 * feedback.js modules. Other modules handle other parts of the keyboard:
 *
 *   layout.js: defines data structures that represent keyboard layouts
 *   render.js: creates the on-screen keyboard with HTML and CSS
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
 *    sendKey(keycode):
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

'use strict';

// InputMethod modules register themselves in this object
const InputMethods = {};

// The default input method is trivial: when the keyboard passes a key
// to it, it just sends that key right back. Real input methods implement
//  a number of other methods
const defaultInputMethod = {
  click: sendKey,
  displaysCandidates: function() { return false; }
};

var inputContext = null;

// The keyboard app can display different layouts for different languages
// We sometimes refer to these different layouts as "keyboards", so this single
// keyboard app can display many different keyboards.  The currently displayed
// keyboard is specified with setKeyboardName(). That function sets the
// following variables based on its argument.  See layout.js for a the data
// structure that maps keyboard names to their layout data.
//
// Note that keyboardName is the name of the currently displayed keyboard.
// currentKeyboardName tracks the value of the keyboard.current setting.
// We don't call setKeyboardName() when keyboard.current changes because
// that causes problems with the async loading of input methods and could
// also cause races if keyboard.current is updated before the enabled keyboards
// settings are updated.  Instead, every time we show the keyboard we ensure
// that keyboardName matches currentKeyboardName and call setKeyboardName to
// update it if necessary.
var keyboardName = null;
var inputMethod = defaultInputMethod;

// These are the possible layout page values
const LAYOUT_PAGE_DEFAULT = 'Default';
const LAYOUT_PAGE_SYMBOLS_I = 'Symbols_1';
const LAYOUT_PAGE_SYMBOLS_II = 'Symbols_2';

// Layout page: what set of symbols should the keyboard display?
var layoutPage = LAYOUT_PAGE_DEFAULT;

// This object is based on the keyboard layout from layout.js, but is
// modified (see modifyLayout()) to include keys for switching keyboards
// and layouts, and type specific keys like ".com" for url keyboards.
var currentLayout = null;

var isWaitingForSecondTap = false;
var isShowingAlternativesMenu = false;
var isShowingKeyboardLayoutMenu = false;
var isContinousSpacePressed = false;
var isUpperCase = false;
var isUpperCaseLocked = false;
var currentKey = null;
var touchEventsPresent = false;
var touchedKeys = {};
var touchCount = 0;
var currentInputType = null;
var currentInputMode = null;
var menuLockedArea = null;
var layoutMenuLockedArea = null;
var isKeyboardRendered = false;
var currentCandidates = [];
var candidatePanelScrollTimer = null;
const CANDIDATE_PANEL_SWITCH_TIMEOUT = 100;

// Show accent char menu (if there is one) after ACCENT_CHAR_MENU_TIMEOUT
const ACCENT_CHAR_MENU_TIMEOUT = 700;

// Backspace repeat delay and repeat rate
const REPEAT_RATE = 75;
const REPEAT_TIMEOUT = 700;

// How long to wait for more focuschange events before processing
const FOCUS_CHANGE_DELAY = 100;

// Taps the shift key twice within CAPS_LOCK_TIMEOUT
// to lock the keyboard at upper case state.
const CAPS_LOCK_TIMEOUT = 450;

// timeout and interval for delete, they could be cancelled on mouse over
var deleteTimeout = 0;
var deleteInterval = 0;
var menuTimeout = 0;
var redrawTimeout = 0;

// This object has one property for each keyboard layout setting.
// If the user turns on that setting in the settings app, the value of
// the property specifies the keyboard layouts that are enabled.
const keyboardGroups = {
  'english': ['en'],
  'dvorak': ['en-Dvorak'],
  'spanish' : ['es'],
  'portuguese' : ['pt_BR'],
  'polish' : ['pl'],
  'catalan' : ['ca'],
  'czech': ['cz'],
  'french': ['fr'],
  'german': ['de'],
  'hungarian': ['hu'],
  'norwegian': ['nb'],
  'swedish': ['sv'],
  'slovak': ['sk'],
  'turkish': ['tr-Q', 'tr-F'],
  'romanian': ['ro'],
  'russian': ['ru'],
  'serbian': ['sr-Latn', 'sr-Cyrl'],
  'hebrew': ['he'],
  'zhuyin': ['zh-Hant-Zhuyin'],
  'pinyin': ['zh-Hans-Pinyin'],
  'arabic': ['ar'],
  'greek': ['el'],
  'japanese': ['jp-kanji']
};

// Define language code aliases to correctly match the relevant keyboard,
// i.e. language -> relevant keyboard name
const keyboardAlias = {
  'en-US': 'en',
  'pt-BR': 'pt_BR'
};

// This is the default keyboard if none is selected in settings
// XXX: switch this to pt-BR?
// XXX: ideally, this should be based on the current language,
const defaultKeyboardNames = ['en'];

const keyboardHashKey = [
  'en', 'en-Dvorak', 'es', 'pt-BR', 'pl',
  'cz', 'fr', 'de', 'nb', 'sk',
  'tr', 'ru', 'sr-Cyrl', 'ar', 'he',
  'el',
  'zh-Hant-Zhuyin', 'zh-Hans-Pinyin', 'jp-kanji',
  'numberLayout'
];

// Special key codes
const BASIC_LAYOUT = -1;
const ALTERNATE_LAYOUT = -2;
const SWITCH_KEYBOARD = -3;
const TOGGLE_CANDIDATE_PANEL = -4;

const specialCodes = [
  KeyEvent.DOM_VK_BACK_SPACE,
  KeyEvent.DOM_VK_CAPS_LOCK,
  KeyEvent.DOM_VK_RETURN,
  KeyEvent.DOM_VK_ALT,
  KeyEvent.DOM_VK_SPACE
];

// These values are initialized with user settings
var currentKeyboardName;
var suggestionsEnabled;
var correctionsEnabled;
var clickEnabled;
var vibrationEnabled;
var enabledKeyboardGroups = {};
var enabledKeyboardNames;
var isSoundEnabled;

// data URL for keyboard click sound
const CLICK_SOUND = './resources/sounds/key.ogg';
const SPECIAL_SOUND = './resources/sounds/special.ogg';

// The audio element used to play the click sound
var clicker;
var specialClicker;

// A MutationObserver we use to spy on the renderer module
var dimensionsObserver;

// A map of event names to event handlers.
// We register these handlers on the keyboard renderer element
var eventHandlers = {
  'touchstart': onTouchStart,
  'mousedown': onMouseDown,
  'mouseup': onMouseUp,
  'mousemove': onMouseMove
};

// For "swipe down to hide" feature
var touchStartCoordinate;
var toShowKeyboardFTU = false;
const SWIPE_VELOCICTY_THRESHOLD = 0.4;

// The first thing we do when the keyboard app loads is query all the
// keyboard-related settings. Only once we have the current settings values
// do we initialize the rest of the keyboard
window.addEventListener('load', getKeyboardSettings);

function getKeyboardSettings() {
  // Before we can initialize the keyboard we need to know the current
  // value of all keyboard-related settings. These are the settings
  // we want to query, with the default values we'll use if the query fails
  var settingsQuery = {
    'keyboard.current': 'en',
    'keyboard.wordsuggestion': true,
    'keyboard.autocorrect': true,
    'keyboard.vibration': false,
    'keyboard.clicksound': false,
    'keyboard.ftu.enabled': false,
    'audio.volume.notification': 7
  };

  // Now query the settings
  getSettings(settingsQuery, function gotSettings(values) {
    // Copy settings values to the corresponding global variables.
    currentKeyboardName = values['keyboard.current'];
    suggestionsEnabled = values['keyboard.wordsuggestion'];
    correctionsEnabled = values['keyboard.autocorrect'];
    vibrationEnabled = values['keyboard.vibration'];
    clickEnabled = values['keyboard.clicksound'];
    isSoundEnabled = !!values['audio.volume.notification'];

    // To see if this is first time the user launches the keyboard
    toShowKeyboardFTU = values['keyboard.ftu.enabled'];

    handleKeyboardSound();

    // set default input method with hash value
    if (window.location.hash !== '') {
      var hashKey = window.location.hash.substring(1);

      if (keyboardHashKey.indexOf(hashKey) !== -1) {
        keyboardName = hashKey;
      } else {
        keyboardName = defaultKeyboardName;
      }
    } else {
      keyboardName = defaultKeyboardName;
    }

    // And create an array of all enabled keyboard layouts from the set
    // of enabled groups
    handleNewKeyboards();

    // We've got all the settings, so initialize the rest
    initKeyboard();
  });
}

function initKeyboard() {
  // First, register handlers to track settings changes
  navigator.mozSettings.addObserver('keyboard.current', function(e) {
    // Switch to the language associated keyboard
    // everything.me also uses this setting to improve searches
    currentKeyboardName = e.settingValue;
  });

  navigator.mozSettings.addObserver('keyboard.wordsuggestion', function(e) {
    // The keyboard won't be displayed when this setting changes, so we
    // don't need to tell the keyboard about the new value right away.
    // We pass the value to the input method when the keyboard is displayed
    suggestionsEnabled = e.settingValue;
  });

  navigator.mozSettings.addObserver('keyboard.autocorrect', function(e) {
    // The keyboard won't be displayed when this setting changes, so we
    // don't need to tell the keyboard about the new value right away.
    // We pass the value to the input method when the keyboard is displayed
    correctionsEnabled = e.settingValue;
  });

  navigator.mozSettings.addObserver('keyboard.vibration', function(e) {
    vibrationEnabled = e.settingValue;
  });

  navigator.mozSettings.addObserver('audio.volume.notification', function(e) {
    isSoundEnabled = !!e.settingValue;
    handleKeyboardSound();
  });

  navigator.mozSettings.addObserver('keyboard.clicksound', function(e) {
    clickEnabled = e.settingValue;
    handleKeyboardSound();
  });

  // Gaia UI Test may change this setting to disable keyboard FTU
  navigator.mozSettings.addObserver('keyboard.ftu.enabled', function(e) {
    toShowKeyboardFTU = e.settingValue;
  });

  // Initialize the rendering module
  IMERender.init(getUpperCaseValue, isSpecialKeyObj);

  // Attach event listeners to the element that does rendering
  for (var event in eventHandlers) {
    IMERender.ime.addEventListener(event, eventHandlers[event]);
  }

  // Prevent focus being taken away by tip window
  var tipWindow = document.getElementById('confirm-dialog');
  function tipFocusHandler(evt) {
    evt.preventDefault();
  }

  tipWindow.addEventListener('mousedown', tipFocusHandler);

  var tipButton = document.getElementById('ftu-ok');
  tipButton.addEventListener('click', function(evt) {
    // Need to preventDefault or it will make the input lose the focus
    evt.preventDefault();
    tipWindow.hidden = true;
  });

  /* To simulate :active effect for button */
  tipButton.addEventListener('mousedown', function mouseDownHandler(evt) {
    tipButton.classList.add('active');
  });

  var inActiveHandlers = ['mouseup', 'mouseleave'];
  inActiveHandlers.forEach(function addInActiveHandler(evtName) {
    tipButton.addEventListener(evtName, function inActiveHandler(evt) {
      tipButton.classList.remove('active');
    });
  });

  dimensionsObserver = new MutationObserver(function() {
    updateTargetWindowHeight();
  });

  // And observe mutation events on the renderer element
  dimensionsObserver.observe(IMERender.ime, {
    childList: true, // to detect changes in IMEngine
    attributes: true, attributeFilter: ['class', 'style', 'data-hidden']
  });

  window.addEventListener('hashchange', function() {
    var inputMethodName = window.location.hash.substring(1);
    setKeyboardName(inputMethodName, function() {
      resetKeyboard();
      showKeyboard();
    });
  }, false);

  // Handle resize events
  window.addEventListener('resize', onResize);

  // Need to listen to both mozvisibilitychange and oninputcontextchange,
  // because we are not sure which will happen first and we will call
  // showKeyboard() when mozHidden is false and we got inputContext
  window.addEventListener('mozvisibilitychange', function visibilityHandler() {
    var inputMethodName = window.location.hash.substring(1);
    setKeyboardName(inputMethodName, function() {
      if (!document.mozHidden && inputContext) {
        showKeyboard();
      } else {
        hideKeyboard();
      }
    });
  });

  window.navigator.mozInputMethod.oninputcontextchange = function() {
    inputContext = navigator.mozInputMethod.inputcontext;
    if (!document.mozHidden && inputContext) {
      showKeyboard();
    } else {
      hideKeyboard();
    }
  };
}

function handleKeyboardSound() {
  if (clickEnabled && isSoundEnabled) {
    clicker = new Audio(CLICK_SOUND);
    specialClicker = new Audio(SPECIAL_SOUND);
  } else {
    clicker = null;
    specialClicker = null;
  }
}

function deactivateInputMethod() {
  if (inputMethod.deactivate) {
    inputMethod.deactivate();
  }
}

function setKeyboardName(name, callback) {
  var keyboard;

  if (name in Keyboards) {
    keyboard = Keyboards[name];
    keyboardName = name;
  }
  else {
    var alias = keyboardAlias[name];
    if (alias in Keyboards) {
      keyboard = Keyboards[alias];
      keyboardName = alias;
    }
    else {
      console.warn('Unknown keyboard name', name);
      return;
    }
  }

  deactivateInputMethod();

  if (keyboard.imEngine) {
    loadIMEngine(name, function() {
      inputMethod = InputMethods[keyboard.imEngine];
      callback();
    });
  } else {
    inputMethod = defaultInputMethod;
    callback();
  }
}

// Support function for render
function isSpecialKeyObj(key) {
  var hasSpecialCode = key.keyCode !== KeyEvent.DOM_VK_SPACE &&
    key.keyCode &&
    specialCodes.indexOf(key.keyCode) !== -1;
  return hasSpecialCode || key.keyCode <= 0;
}

// This code is only triggered on startup and when the user is in the
// Settings app. So no keyboard is displayed when it happens and we don't
// have to change anything on the screen.
function handleNewKeyboards() {
  enabledKeyboardNames = [];
  for (var group in keyboardGroups) {
    if (enabledKeyboardGroups['keyboard.layouts.' + group]) {
      keyboardGroups[group].forEach(function(name) {
        if (enabledKeyboardNames.indexOf(name) === -1)
          enabledKeyboardNames.push(name);
      });
    }
  }

  // If no keyboards were selected, use a default
  if (enabledKeyboardNames.length === 0)
    Array.prototype.push.apply(enabledKeyboardNames,
                               defaultKeyboardNames);

  // Now load each of these keyboards and their input methods
  for (var i = 0; i < enabledKeyboardNames.length; i++)
    loadKeyboard(enabledKeyboardNames[i]);

  // If the keyboard has been disabled, reset keyboardName allowing it to be
  // properly set when showing the keyboard
  if (enabledKeyboardNames.indexOf(keyboardName) == -1)
    keyboardName = null;
}

// Map the input type to another type
function mapInputType(type) {
  switch (type) {
    // basic types
  case 'url':
  case 'tel':
  case 'email':
  case 'text':
    return type;
    break;

    // default fallback and textual types
  case 'password':
  case 'search':
  default:
    return 'text';
    break;

  case 'number':
  case 'range': // XXX: should be different from number
    return 'number';
    break;
  }
}

//
// This function takes a keyboard layout, makes a copy of that layout
// and then modifies it to add meta keys for switching languages and
// switching to numbers and symbols. It may also add keys (like a
// ".com" and '@') that are specific to input of currentInputType.
//
// The return value is the modified layout data structure.
//
// Normally, this function modifies the base layout for the specified
// keyboard name, but it may use a different starting layout depending on
// currentInputType and layoutPage.
//
function modifyLayout(keyboardName) {
  // One level copy
  function copy(obj) {
    var newObj = {};
    for (var prop in obj) if (obj.hasOwnProperty(prop)) {
      newObj[prop] = obj[prop];
    }
    return newObj;
  }

  var altLayoutName;

  switch (currentInputType) {
    case 'tel':
      altLayoutName = 'telLayout';
      break;
    case 'number':
      altLayoutName = currentInputMode === 'digit' ?
                                           'pinLayout' : 'numberLayout';
      break;
    // The matches when type="password", "text", or "search",
    // see mapInputType() for details
    case 'text':
      if (currentInputMode === 'digit') {
        altLayoutName = 'pinLayout';
      } else if (currentInputMode === 'numeric') {
        altLayoutName = 'numberLayout';
      }
      break;
  }

  if (layoutPage === LAYOUT_PAGE_SYMBOLS_I) {
    altLayoutName = 'alternateLayout';
  } else if (layoutPage === LAYOUT_PAGE_SYMBOLS_II) {
    altLayoutName = 'symbolLayout';
  }

  // Start with this base layout
  var layout;
  if (altLayoutName) {
    layout = Keyboards[keyboardName][altLayoutName] || Keyboards[altLayoutName];
  }
  else {
    layout = Keyboards[keyboardName];
  }

  // Look for the space key in the layout. We're going to insert
  // meta keys before it or after it.
  var where = false;
  for (var r = 0, row; !where && (row = layout.keys[r]); r += 1) {
    for (var c = 0, space; space = layout.keys[r][c]; c += 1) {
      if (space.keyCode == KeyboardEvent.DOM_VK_SPACE) {
        where = r;
        break;
      }
    }
  }

  // if found, add special keys
  if (where) {
    // we will perform some alchemy here, so preserve...
    layout = copy(layout); // the original space row
    layout.keys = layout.keys.slice(0);
    row = layout.keys[where] = layout.keys[where].slice(0);
    space = copy(space);   // and the original space key
    row[c] = space;


    // Alternate layout key
    // This gives the author the ability to change the alternate layout
    // key contents
    var alternateLayoutKey = '?123';
    if (layout['alternateLayoutKey']) {
      alternateLayoutKey = layout['alternateLayoutKey'];
    }

    // This gives the author the ability to change the basic layout
    // key contents
    // 'layout' holds alternatelayout which doesn't include basicLayoutKey.
    // Check and use 'basicLayoutKey' defined by each keyboard.
    var basicLayoutKey = 'ABC';
    if (Keyboards[keyboardName]['basicLayoutKey']) {
      basicLayoutKey = Keyboards[keyboardName]['basicLayoutKey'];
    }

    if (!layout['disableAlternateLayout']) {
      space.ratio -= 1.5;
      if (layoutPage === LAYOUT_PAGE_DEFAULT) {
        row.splice(c, 0, {
          keyCode: ALTERNATE_LAYOUT,
          value: alternateLayoutKey,
          ratio: 1.5
        });

      } else {
        row.splice(c, 0, {
          keyCode: BASIC_LAYOUT,
          value: basicLayoutKey,
          ratio: 1.5
        });
      }
      c += 1;
    }

    // switch languages button
    var supportsSwitching = navigator.mozInputMethod.mgmt.supportsSwitching();
    if (!layout['hidesSwitchKey'] && supportsSwitching) {
      space.ratio -= 1.5;
      row.splice(c, 0, {
        value: '&#x1f310;',
        ratio: 1.5,
        keyCode: SWITCH_KEYBOARD
      });
      c += 1;
    }

    // Now modify the layout some more based on the input type
    if (!layout['typeInsensitive']) {
      switch (currentInputType) {
        // adds . / and .com
      case 'url':
        space.ratio -= 5;
        row.splice(c, 1, // delete space
                   { value: '.', ratio: 1, keyCode: 46 },
                   { value: '/', ratio: 2, keyCode: 47 },
                   // As we are removing the space we need to assign
                   // the extra space (i.e to .com)
                   { value: '.com',
                     ratio: 2 + space.ratio,
                     compositeKey: '.com'
                   }
                  );

        break;

        // adds @ and .
      case 'email':
        space.ratio -= 2;
        row.splice(c, 0, { value: '@', ratio: 1, keyCode: 64 });
        row.splice(c + 2, 0, { value: '.', ratio: 1, keyCode: 46 });
        break;

        // adds . and , to both sides of the space bar
      case 'text':
        var overwrites = layout.textLayoutOverwrite || {};
        var next = c;
        if (overwrites['.'] !== false) {
          space.ratio -= 1;
          next++;
        }

        // Add ',' to 2nd level
        if (layoutPage !== LAYOUT_PAGE_DEFAULT) {

          if (overwrites[','] !== false) {
            space.ratio -= 1;
            next++;
          }

          var commaKey = {value: ',', keyCode: 44, ratio: 1};

          if (overwrites[',']) {
            commaKey.value = overwrites[','];
            commaKey.keyCode = overwrites[','].charCodeAt(0);
            row.splice(c, 0, commaKey);
          } else if (overwrites[','] !== false) {
            row.splice(c, 0, commaKey);
          }
        }

        if (overwrites['.']) {
          row.splice(next, 0, {
            value: overwrites['.'],
            ratio: 1,
            keyCode: overwrites['.'].charCodeAt(0)
          });
        } else if (overwrites['.'] !== false) {
          row.splice(next, 0, {
            value: '.',
            ratio: 1,
            keyCode: 46
          });
        }

        break;
      }
    }
  } else {
    console.warn('No space key found. No special keys will be added.');
  }

  return layout;
}

//
// This function asks render.js to create an HTML layout for the keyboard.
// The layout is based on the layout in layout.js, but is augmented by
// modifyLayout() to include keyboard-switching keys and type-specific keys
// for url and email address input, e.g.
//
// This should be called when the keyboard changes or when the layout page
// changes.
//
// Note that calling this function sets the global variable currentLayout.
//
// Also note that currentInputType and layoutPage may both override
// keyboardName to produce a currentLayout that is different than the base
// layout for keyboardName
//
function renderKeyboard(keyboardName) {
  // Add meta keys and type-specific keys to the base layout
  currentLayout = modifyLayout(keyboardName);

  function drawKeyboard() {
    // Tell the renderer what input method we're using. This will set a CSS
    // classname that can be used to style the keyboards differently
    var keyboard = Keyboards[keyboardName];
    IMERender.setInputMethodName(keyboard.imEngine || 'default');

    IMERender.ime.classList.remove('full-candidate-panel');

    // And draw the layout
    IMERender.draw(currentLayout, {
      uppercase: isUpperCaseLocked || isUpperCase,
      inputType: currentInputType,
      showCandidatePanel: needsCandidatePanel()
    });

    IMERender.setUpperCaseLock(isUpperCaseLocked ? 'locked' : isUpperCase);

    // If needed, empty the candidate panel
    if (inputMethod.empty)
      inputMethod.empty();

    // Tell the input method about the new keyboard layout
    updateLayoutParams();

    //restore the previous candidates
    IMERender.showCandidates(currentCandidates);

    isKeyboardRendered = true;
  }

  clearTimeout(redrawTimeout);

  // Does this new keyboard use the candidate panel?
  var showsCandidates = needsCandidatePanel();

  // If it doesn't and the keyboard has be shown, then notify the keyboard
  // manager update the app window size before redrawing the keyboard.
  // XXX: for Bug 893755 - we would always do the delay of keyboard redrawing
  // without regard to whether candidate panel was enabled or not last time.
  if (!showsCandidates && isKeyboardRendered) {
    var candidatePanel = document.getElementById('keyboard-candidate-panel');
    var candidatePanelHeight = (candidatePanel) ?
                               candidatePanel.scrollHeight : 0;

    var imeHeight = IMERender.ime.scrollHeight - candidatePanelHeight;
    var imeWidth = IMERender.getWidth();
    window.resizeTo(imeWidth, imeHeight);
    redrawTimeout = window.setTimeout(drawKeyboard,
                                      CANDIDATE_PANEL_SWITCH_TIMEOUT);
  } else {
    drawKeyboard();
  }

  // Remember whether the candidate panel is shown or not
}

function setUpperCase(upperCase, upperCaseLocked) {

  upperCaseLocked = (typeof upperCaseLocked == 'undefined') ?
                     isUpperCaseLocked : upperCaseLocked;

  // Do nothing if the states are not changed
  if (isUpperCase == upperCase &&
      isUpperCaseLocked == upperCaseLocked)
    return;

  isUpperCaseLocked = upperCaseLocked;
  isUpperCase = upperCase;

  if (!isKeyboardRendered)
    return;
  // When case changes we have to re-render the keyboard.
  // But note that we don't have to relayout the keyboard, so
  // we call draw() directly instead of renderKeyboard()
  IMERender.draw(currentLayout, {
    uppercase: isUpperCaseLocked || isUpperCase,
    inputType: currentInputType,
    showCandidatePanel: needsCandidatePanel()
  });
  // And make sure the caps lock key is highlighted correctly
  IMERender.setUpperCaseLock(isUpperCaseLocked ? 'locked' : isUpperCase);

  //restore the previous candidates
  IMERender.showCandidates(currentCandidates);
}

function resetUpperCase() {
  if (isUpperCase &&
      !isUpperCaseLocked &&
      layoutPage === LAYOUT_PAGE_DEFAULT) {
    setUpperCase(false);
  }
}

function setLayoutPage(newpage) {
  if (newpage === layoutPage)
    return;

  // When layout mode changes we have to re-render the keyboard
  layoutPage = newpage;

  renderKeyboard(keyboardName);

  if (inputMethod.setLayoutPage)
    inputMethod.setLayoutPage(layoutPage);
}

// Inform about a change in the displayed application via mutation observer
// http://hacks.mozilla.org/2012/05/dom-mutationobserver-reacting-to-dom-changes-without-killing-browser-performance/
function updateTargetWindowHeight(hide) {
  var imeHeight = IMERender.ime.scrollHeight;
  var imeWidth = IMERender.getWidth();
  window.resizeTo(imeWidth, imeHeight);
}

// Sends a delete code to remove last character
// The argument specifies whether this is an auto repeat or not.
// We call triggerFeedback() for the initial press, but we
// purposefully do not call it again for auto repeating delete.
function sendDelete(isRepeat) {
  // Pass the isRepeat argument to the input method. It may not want
  // to compute suggestions, for example, if this is just one in a series
  // of repeating events.
  inputMethod.click(KeyboardEvent.DOM_VK_BACK_SPACE, isRepeat);
}

// Return the upper value for a key object
function getUpperCaseValue(key) {
  var hasSpecialCode = specialCodes.indexOf(key.keyCode) > -1;
  if (key.keyCode < 0 || hasSpecialCode || key.compositeKey)
    return key.value;

  var upperCase = currentLayout.upperCase || {};
  return upperCase[key.value] || key.value.toUpperCase();
}

function setMenuTimeout(target, coords, touchId) {
  // Only set a timeout to show alternatives if there is one touch.
  // This avoids paving over menuTimeout with a new timeout id
  // from a separate touch.
  if (touchCount > 1)
    return;

  menuTimeout = window.setTimeout(function menuTimeout() {
    // Don't try to show the alternatives menu if it's already showing,
    // or if there's more than one touch on the screen.
    if (isShowingAlternativesMenu || touchCount > 1)
      return;

    // The telLayout and numberLayout do not show an alternative key
    // menu, instead they send the alternative key and ignore the endPress.
    if (currentInputType === 'number' || currentInputType === 'tel') {

      // Does the key have an altKey?
      var r = target.dataset.row, c = target.dataset.column;
      var keyChar = currentLayout.keys[r][c].value;
      var altKey = currentLayout.alt[keyChar] || null;

      if (!altKey)
        return;

      // Attach a dataset property that will be used to ignore
      // keypress in endPress
      target.dataset.ignoreEndPress = true;

      var keyCode = altKey.charCodeAt(0);
      sendKey(keyCode);

      return;
    }

    showAlternatives(target);

    // If we successfuly showed the alternatives menu, redirect the
    // press over the first key in the menu.
    if (isShowingAlternativesMenu)
      movePress(target, coords, touchId);

  }, ACCENT_CHAR_MENU_TIMEOUT);
}

// Show alternatives for the HTML node key
function showAlternatives(key) {
  // Get the key object from layout
  var alternatives, altMap, value, keyObj, uppercaseValue, needsCapitalization;
  var r = key ? key.dataset.row : -1, c = key ? key.dataset.column : -1;
  if (r < 0 || c < 0 || r === undefined || c === undefined)
    return;
  keyObj = currentLayout.keys[r][c];

  // Handle languages alternatives
  if (keyObj.keyCode === SWITCH_KEYBOARD) {
    showIMEList();
    return;
  }

  // Handle key alternatives
  altMap = currentLayout.alt || {};
  value = keyObj.value;
  alternatives = altMap[value] || '';

  // If in uppercase, look for uppercase alternatives. If we don't find any
  // then set a flag so we can manually capitalize the alternatives below.
  if (isUpperCase || isUpperCaseLocked) {
    uppercaseValue = getUpperCaseValue(keyObj);
    if (altMap[uppercaseValue]) {
      alternatives = altMap[uppercaseValue];
    }
    else {
      needsCapitalization = true;
    }
  }

  // Split alternatives
  // If the alternatives are delimited by spaces, it means that one or more
  // of them is more than a single character long.
  if (alternatives.indexOf(' ') != -1) {
    alternatives = alternatives.split(' ');

    // If there is just a single multi-character alternative, it will have
    // trailing whitespace which we have to discard here.
    if (alternatives.length === 2 && alternatives[1] === '')
      alternatives.pop();

    if (needsCapitalization) {
      for (var i = 0; i < alternatives.length; i++) {
        if (isUpperCaseLocked) {
          // Caps lock is on, so capitalize all the characters
          alternatives[i] = alternatives[i].toLocaleUpperCase();
        }
        else {
          // We're in uppercase, but not locked, so just capitalize 1st char.
          alternatives[i] = alternatives[i][0].toLocaleUpperCase() +
            alternatives[i].substring(1);
        }
      }
    }
  } else {
    // No spaces, so all of the alternatives are single characters
    if (needsCapitalization) // Capitalize them all at once before splitting
      alternatives = alternatives.toLocaleUpperCase();
    alternatives = alternatives.split('');
  }

  if (!alternatives.length)
    return;

  // Locked limits
  // TODO: look for [LOCKED_AREA]
  var top = getWindowTop(key);
  var bottom = getWindowTop(key) + key.scrollHeight;

  IMERender.showAlternativesCharMenu(key, alternatives);
  isShowingAlternativesMenu = true;

  // Locked limits
  // TODO: look for [LOCKED_AREA]
  menuLockedArea = {
    top: top,
    bottom: bottom,
    left: getWindowLeft(IMERender.menu),
    right: getWindowLeft(IMERender.menu) + IMERender.menu.scrollWidth
  };
  menuLockedArea.width = menuLockedArea.right - menuLockedArea.left;
  menuLockedArea.ratio =
    menuLockedArea.width / IMERender.menu.children.length;
}

// Hide alternatives.
function hideAlternatives() {
  if (!isShowingAlternativesMenu)
    return;

  IMERender.hideAlternativesCharMenu();
  isShowingAlternativesMenu = false;
}

function showKeyboardLayoutMenu(key) {

  // Get the coordinates of the key first, since it will be replaced
  // in the call to showKeyboardAlternatives()
  var top = getWindowTop(key);
  var bottom = getWindowTop(key) + key.scrollHeight;

  IMERender.showKeyboardAlternatives(
    key,
    enabledKeyboardNames,
    keyboardName,
    SWITCH_KEYBOARD
  );

  isShowingKeyboardLayoutMenu = true;

  // create "LOCKED_AREA" for keyboard layout menu
  layoutMenuLockedArea = {
    top: getWindowTop(IMERender.menu),
    bottom: bottom,
    left: getWindowLeft(IMERender.menu),
    right: getWindowLeft(IMERender.menu) + IMERender.menu.scrollWidth
  };
}

// Hide keyboard layout menu
function hideKeyboardLayoutMenu() {
  if (!isShowingKeyboardLayoutMenu)
    return;

  IMERender.hideAlternativesCharMenu();
  KeyboardMenuScroll.reset();
  isShowingKeyboardLayoutMenu = false;
}

// Test if an HTML node is a normal key
function isNormalKey(key) {
  var keyCode = parseInt(key.dataset.keycode);
  return keyCode || key.dataset.selection || key.dataset.compositekey;
}

//
// Event Handlers
//

function onTouchStart(evt) {
  // Prevent a mouse event from firing (this doesn't currently work
  // because of bug 819102)

  if (!IMERender.isFullCandidataPanelShown())
    evt.preventDefault();

  // Let the world know that we're using touch events.
  touchEventsPresent = true;

  // Don't allow new touches if the alternatives menu is showing.
  if (isShowingAlternativesMenu)
    return;

  touchCount = evt.touches.length;

  handleTouches(evt, function handleTouchStart(touch, touchId) {
    var target = touch.target;

    // Add touchmove and touchend listeners directly to the target so that we
    // will always hear these events, even if the target is removed from the
    // DOM.
    // This can happen when the keyboard switches cases, as well as when we
    // show the alternate characters menu for a key.
    target.addEventListener('touchmove', onTouchMove);
    target.addEventListener('touchend', onTouchEnd);
    target.addEventListener('touchcancel', onTouchEnd);

    touchedKeys[touchId] = { target: target, x: touch.pageX, y: touch.pageY };
    startPress(target, touch, touchId);

    touchStartCoordinate = { touchId: touchId,
                             pageX: touch.pageX,
                             pageY: touch.pageY,
                             timeStamp: evt.timeStamp };
  });
}

function onTouchMove(evt) {
  // Prevent a mouse event from firing
  if (!IMERender.isFullCandidataPanelShown())
    evt.preventDefault();

  handleTouches(evt, function handleTouchMove(touch, touchId) {
    // Avoid calling document.elementFromPoint and movePress if
    // the touch hasn't moved very far.
    var x = Math.abs(touchedKeys[touchId].x - touch.pageX);
    var y = Math.abs(touchedKeys[touchId].y - touch.pageY);
    if (x < 5 && y < 5)
      return;

    // Update our cached x/y values.
    touchedKeys[touchId].x = touch.pageX;
    touchedKeys[touchId].y = touch.pageY;

    // touch.target is the element that the touch started on, so we
    // need to find the new key with elementFromPoint.
    var target = document.elementFromPoint(touch.pageX, touch.pageY);
    movePress(target, touch, touchId);
  });
}

function onTouchEnd(evt) {
  // Prevent a mouse event from firing
  if (!IMERender.isFullCandidataPanelShown())
    evt.preventDefault();

  touchCount = evt.touches.length;

  handleTouches(evt, function handleTouchEnd(touch, touchId) {

    // Swipe down can trigger hiding the keyboard
    if (touchStartCoordinate && touchStartCoordinate.touchId == touchId) {
      var dx = touch.pageX - touchStartCoordinate.pageX;
      var dy = touch.pageY - touchStartCoordinate.pageY;
      var dt = evt.timeStamp - touchStartCoordinate.timeStamp;
      var vy = dy / dt;

      var keyboardHeight = IMERender.ime.scrollHeight;
      var hasCandidateScrolled = (IMERender.isFullCandidataPanelShown() &&
                                  (Math.abs(dx) > 3 || Math.abs(dy) > 3));

      // hide the keyboard if:
      // 1. swipe down
      // 2. the distance is longer than half of the keyboard
      // 3. not in candidate panel
      if ((dy > keyboardHeight / 2 && dy > dx) &&
          vy > SWIPE_VELOCICTY_THRESHOLD &&
          !hasCandidateScrolled) {

        // de-activate the highlighted effect
        if (touchedKeys[touchId] && touchedKeys[touchId].target)
          IMERender.unHighlightKey(touchedKeys[touchId].target);

        clearTimeout(deleteTimeout);
        clearInterval(deleteInterval);
        clearTimeout(menuTimeout);

        navigator.mozInputMethod.mgmt.hide();
        return;
      }
    }

    // Because of bug 822558, we sometimes get two touchend events,
    // so we should bail if we've already handled one touchend.
    if (!touchedKeys[touchId])
      return;

    // Remove the event listeners from the original target.
    var target = touch.target;
    target.removeEventListener('touchmove', onTouchMove);
    target.removeEventListener('touchend', onTouchEnd);
    target.removeEventListener('touchcancel', onTouchEnd);

    // Send the updated target to endPress.
    endPress(touchedKeys[touchId].target, touch, touchId, hasCandidateScrolled);
    delete touchedKeys[touchId];
  });
}

// Helper function to iterate through a touch event's
// changedTouches array. For each touch, it calls a callback
// function with the touch and touchId as arguments.
function handleTouches(evt, callback) {
  for (var i = 0; i < evt.changedTouches.length; i++) {
    var touch = evt.changedTouches[i];
    var touchId = touch.identifier;
    callback(touch, touchId);
  }
}

// Mouse events will fire after touch events. Because preventDefault()
// isn't working properly for touch events (bug 819102), we need to
// handle these subsequent mouse events ourselves.
// FIXME: We should be able to get rid of these touchEventsPresent checks
// once bug 819102 is fixed.
function onMouseDown(evt) {
  // Prevent loosing focus to the currently focused app
  // Otherwise, right after mousedown event, the app will receive a focus event.
  evt.preventDefault();

  // Bail if we're using touch events.
  if (touchEventsPresent)
    return;

  IMERender.ime.setCapture(false);
  currentKey = evt.target;
  startPress(currentKey, evt, null);
}

// The coords object can either be a mouse event or a touch. We just expect the
// coords object to have clientX, clientY, pageX, and pageY properties.
function startPress(target, coords, touchId) {
  if (!isNormalKey(target))
    return;

  var keyCode = parseInt(target.dataset.keycode);

  // Feedback
  var isSpecialKey = specialCodes.indexOf(keyCode) >= 0 || keyCode < 0;
  triggerFeedback(isSpecialKey);
  IMERender.highlightKey(target);

  setMenuTimeout(target, coords, touchId);

  // Special keys (such as delete) response when pressing (not releasing)
  // Furthermore, delete key has a repetition behavior
  if (keyCode === KeyEvent.DOM_VK_BACK_SPACE) {

    // First, just pressing (without feedback)
    sendDelete(false);

    // Second, after a delay (with feedback)
    deleteTimeout = window.setTimeout(function() {
      sendDelete(true);

      // Third, after shorter delay (with feedback too)
      deleteInterval = setInterval(function() {
        sendDelete(true);
      }, REPEAT_RATE);

    }, REPEAT_TIMEOUT);
  }
}

function inMenuLockedArea(lockedArea, coords) {
  return (lockedArea &&
          coords.pageY >= lockedArea.top &&
          coords.pageY <= lockedArea.bottom &&
          coords.pageX >= lockedArea.left &&
          coords.pageX <= lockedArea.right);
}

function onMouseMove(evt) {
  if (touchEventsPresent)
    return;

  movePress(evt.target, evt, null);
}

// [LOCKED_AREA] TODO:
// This is an agnostic way to improve the usability of the alternatives.
// It consists into compute an area where the user movement is redirected
// to the alternative menu keys but I would prefer another alternative
// with better performance.
function movePress(target, coords, touchId) {
  // Control locked zone for menu
  if (isShowingAlternativesMenu && inMenuLockedArea(menuLockedArea, coords)) {
    var menuChildren = IMERender.menu.children;
    var redirectTarget = menuChildren[Math.floor(
      (coords.pageX - menuLockedArea.left) / menuLockedArea.ratio)];

    target = redirectTarget;
  }

  if (isShowingKeyboardLayoutMenu &&
      target.dataset && target.dataset.keyboard) {
      KeyboardMenuScroll.scrollKeyboardMenu(target, coords);
  }

  var oldTarget = touchEventsPresent ? touchedKeys[touchId].target : currentKey;

  // Do nothing if there are invalid targets, if the user is touching the
  // same key, or if the new target is not a normal key.
  if (!target || !oldTarget || oldTarget == target || !isNormalKey(target))
    return;

  // Update highlight: remove from older
  IMERender.unHighlightKey(oldTarget);

  var keyCode = parseInt(target.dataset.keycode);

  // Update highlight: add to the new (Ignore if moving over delete key)
  if (keyCode != KeyEvent.DOM_VK_BACK_SPACE)
    IMERender.highlightKey(target);

  setCurrentKey(target, touchId);

  clearTimeout(deleteTimeout);
  clearInterval(deleteInterval);
  clearTimeout(menuTimeout);

  // Hide of alternatives menu if the touch moved out of it
  if (target.parentNode !== IMERender.menu &&
      isShowingAlternativesMenu &&
      !inMenuLockedArea(menuLockedArea, coords))
    hideAlternatives();

  // Hide keyboard layout menu if the touch moved out of its locked area
  if (isShowingKeyboardLayoutMenu &&
      !inMenuLockedArea(layoutMenuLockedArea, coords)) {
      hideKeyboardLayoutMenu();
  }

  // Control showing alternatives menu
  setMenuTimeout(target, coords, touchId);

  function setCurrentKey(value, touchId) {
    if (touchEventsPresent)
      touchedKeys[touchId].target = value;
    else
      currentKey = value;
  }
}

function onMouseUp(evt) {
  if (touchEventsPresent)
    return;

  endPress(currentKey, evt, null);
  currentKey = null;
}

// The user is releasing a key so the key has been pressed. The meat is here.
function endPress(target, coords, touchId, hasCandidateScrolled) {
  clearTimeout(deleteTimeout);
  clearInterval(deleteInterval);
  clearTimeout(menuTimeout);

  var wasShowingKeyboardLayoutMenu = isShowingKeyboardLayoutMenu;
  hideAlternatives();
  hideKeyboardLayoutMenu();

  if (!target || !isNormalKey(target))
    return;

  // IME candidate selected
  var dataset = target.dataset;
  if (dataset.selection) {
    if (!hasCandidateScrolled) {
      IMERender.toggleCandidatePanel(false);

      if (inputMethod.select) {
        // We use dataset.data instead of target.textContent because the
        // text actually displayed to the user might have an ellipsis in it
        // to make it fit.
        inputMethod.select(target.textContent, dataset.data);
      }
    }

    IMERender.unHighlightKey(target);
    return;
  }

  IMERender.unHighlightKey(target);

  // The alternate keys of telLayout and numberLayout do not
  // trigger keypress on key release.
  if (target.dataset.ignoreEndPress) {
    delete target.dataset.ignoreEndPress;
    return;
  }

  var keyCode = parseInt(target.dataset.keycode);

  // Delete is a special key, it reacts when pressed not released
  if (keyCode == KeyEvent.DOM_VK_BACK_SPACE)
    return;

  // Reset the flag when a non-space key is pressed,
  // used in space key double tap handling
  if (keyCode != KeyEvent.DOM_VK_SPACE)
    isContinousSpacePressed = false;

  var keyStyle = getComputedStyle(target);
  if (keyStyle.display == 'none' || keyStyle.visibility == 'hidden')
    return;

  // Handle normal key
  switch (keyCode) {

  case BASIC_LAYOUT:
    // Return to default page
    setLayoutPage(LAYOUT_PAGE_DEFAULT);
    break;

  case ALTERNATE_LAYOUT:
    // Switch to numbers+symbols page
    setLayoutPage(LAYOUT_PAGE_SYMBOLS_I);
    break;

  case KeyEvent.DOM_VK_ALT:
    // alternate between pages 1 and 2 of SYMBOLS
    if (layoutPage === LAYOUT_PAGE_SYMBOLS_I) {
      setLayoutPage(LAYOUT_PAGE_SYMBOLS_II);
    } else {
      setLayoutPage(LAYOUT_PAGE_SYMBOLS_I);
    }
    break;

    // Switch language (keyboard)
  case SWITCH_KEYBOARD:
    // If the user selected a new keyboard layout or quickly tapped the
    // switch layouts button then switch to a new keyboard layout
    if (target.dataset.keyboard || !wasShowingKeyboardLayoutMenu)
      switchToNextIME();
    break;

    // Expand / shrink the candidate panel
  case TOGGLE_CANDIDATE_PANEL:
    var candidatePanel = document.getElementById('keyboard-candidate-panel');

    if (IMERender.ime.classList.contains('candidate-panel')) {
      var doToggleCandidatePanel = function doToggleCandidatePanel() {
        if (candidatePanel.dataset.truncated) {
          if (candidatePanelScrollTimer) {
            clearTimeout(candidatePanelScrollTimer);
            candidatePanelScrollTimer = null;
          }
          candidatePanel.addEventListener('scroll', candidatePanelOnScroll);
        }

        IMERender.toggleCandidatePanel(true);
      };

      if (candidatePanel.dataset.rowCount == 1) {
        var firstPageRows = 11;
        var numberOfCandidatesPerRow = IMERender.getNumberOfCandidatesPerRow();
        var candidateIndicator =
          parseInt(candidatePanel.dataset.candidateIndicator);

        if (inputMethod.getMoreCandidates) {
          inputMethod.getMoreCandidates(
            candidateIndicator,
            firstPageRows * numberOfCandidatesPerRow + 1,
            function getMoreCandidatesCallbackOnToggle(list) {
              if (candidatePanel.dataset.rowCount == 1) {
                IMERender.showMoreCandidates(firstPageRows, list);
                doToggleCandidatePanel();
              }
            }
          );
        } else {
          var list = currentCandidates.slice(candidateIndicator,
            candidateIndicator + firstPageRows * numberOfCandidatesPerRow + 1);

          IMERender.showMoreCandidates(firstPageRows, list);
          doToggleCandidatePanel();
        }
      } else {
        doToggleCandidatePanel();
      }
    } else {
      if (inputMethod.getMoreCandidates) {
        candidatePanel.removeEventListener('scroll', candidatePanelOnScroll);
        if (candidatePanelScrollTimer) {
          clearTimeout(candidatePanelScrollTimer);
          candidatePanelScrollTimer = null;
        }
      }

      IMERender.toggleCandidatePanel(false);
    }
    break;

    // Shift or caps lock
  case KeyEvent.DOM_VK_CAPS_LOCK:

    // Already waiting for caps lock
    if (isWaitingForSecondTap) {
      isWaitingForSecondTap = false;

      setUpperCase(true, true);

      // Normal behavior: set timeout for second tap and toggle caps
    } else {

      isWaitingForSecondTap = true;
      window.setTimeout(
        function() {
          isWaitingForSecondTap = false;
        },
        CAPS_LOCK_TIMEOUT
      );

      // Toggle caps
      setUpperCase(!isUpperCase, false);
    }
    break;

    // Normal key
  default:
    if (target.dataset.compositekey) {
      // Keys with this attribute set send more than a single character
      // Like ".com" or "2nd" or (in Catalan) "l·l".
      var compositeKey = target.dataset.compositekey;
      for (var i = 0; i < compositeKey.length; i++) {
        inputMethod.click(compositeKey.charCodeAt(i));
      }
    }
    else {
      inputMethod.click(keyCode);
    }
    break;
  }
}

function candidatePanelOnScroll() {
  if (candidatePanelScrollTimer) {
    clearTimeout(candidatePanelScrollTimer);
    candidatePanelScrollTimer = null;
  }

  if (this.scrollTop != 0 &&
      this.scrollHeight - this.clientHeight - this.scrollTop < 5) {

    candidatePanelScrollTimer = setTimeout(function() {
      var pageRows = 12;
      var numberOfCandidatesPerRow = IMERender.getNumberOfCandidatesPerRow();
      var candidatePanel = document.getElementById('keyboard-candidate-panel');
      var candidateIndicator =
        parseInt(candidatePanel.dataset.candidateIndicator);

      if (inputMethod.getMoreCandidates) {
        inputMethod.getMoreCandidates(
          candidateIndicator,
          pageRows * numberOfCandidatesPerRow + 1,
          IMERender.showMoreCandidates.bind(IMERender, pageRows)
        );
      } else {
        var list = currentCandidates.slice(candidateIndicator,
          candidateIndicator + pageRows * numberOfCandidatesPerRow + 1);

        IMERender.showMoreCandidates(pageRows, list);
      }
    }, 200);
  }
}

function getKeyCoordinateY(y) {
  var candidatePanel = document.getElementById('keyboard-candidate-panel');

  var yBias = 0;
  if (candidatePanel)
    yBias = candidatePanel.clientHeight;

  return y - yBias;
}

function switchToNextIME() {
  deactivateInputMethod();
  var mgmt = navigator.mozInputMethod.mgmt;
  mgmt.next();
}


function showIMEList() {
  var mgmt = navigator.mozInputMethod.mgmt;
  mgmt.showAll();
}

// Turn to default values
function resetKeyboard() {
  // Don't call setLayoutPage because renderKeyboard() should be invoked
  // separately after this function
  layoutPage = LAYOUT_PAGE_DEFAULT;
  // Don't call setUpperCase because renderKeyboard() should be invoked
  // separately after this function
  isUpperCase = false;
  isUpperCaseLocked = false;
}

// This is a wrapper around inputContext.sendKey()
// We use it in the defaultInputMethod and in the interface object
// we pass to real input methods
function sendKey(keyCode) {
  switch (keyCode) {
  case KeyEvent.DOM_VK_BACK_SPACE:
  case KeyEvent.DOM_VK_RETURN:
    if (inputContext) {
      inputContext.sendKey(keyCode, 0, 0);
    }
    break;

  default:
    if (inputContext) {
      inputContext.sendKey(0, keyCode, 0);
    }
    break;
  }
}

function replaceSurroundingText(text, offset, length) {
  if (inputContext) {
    inputContext.replaceSurroundingText(text, offset, length);
  } else {
    console.warn('no inputContext for replaceSurroudingText');
  }
}

// Set up the keyboard and its input method.
// This is called when we get an event from mozKeyboard.
// The state argument is the data passed with that event, and includes
// the input field type, its inputmode, its content, and the cursor position.
function showKeyboard() {
  // If no keyboard has been selected yet, choose the first enabled one.
  // This will also set the inputMethod
  if (!keyboardName) {
    setKeyboardName(defaultKeyboardName, showKeyboard.bind(this));
    return;
  }

  inputContext = navigator.mozInputMethod.inputcontext;
  IMERender.showIME();

  resetKeyboard();

  if (toShowKeyboardFTU) {
    var dialog = document.getElementById('confirm-dialog');
    dialog.hidden = false;
    toShowKeyboardFTU = false;

    navigator.mozSettings.createLock().set({
      'keyboard.ftu.enabled': false
    });
  }

  if (inputContext) {
    currentInputMode = inputContext.inputMode;
    currentInputType = mapInputType(inputContext.inputType);
  } else {
    currentInputMode = '';
    currentInputType = mapInputType('text');
    return;
  }

  var state = {
    type: inputContext.inputType,
    inputmode: inputContext.inputMode,
    selectionStart: inputContext.selectionStart,
    selectionEnd: inputContext.selectionEnd,
    value: ''
  };

  function doShowKeyboard() {
    if (inputMethod.activate) {
      inputMethod.activate(Keyboards[keyboardName].autoCorrectLanguage,
        state, {
          suggest: suggestionsEnabled,
          correct: correctionsEnabled
        });
    }

    // render the keyboard after activation, which will determine the state
    // of uppercase/suggestion, etc.
    renderKeyboard(keyboardName);
  }

  var promise = inputContext.getText();

  // XXX: Bug 906096, make keyboard can show up in Firefox Nightly
  // before the IME WebAPI is ready
  if (!promise.then) {
    doShowKeyboard();
    return;
  }

  promise.then(function gotText(value) {
    state.value = value;
    doShowKeyboard();
  }, function failedToGetText() {
    doShowKeyboard();
  });
}

// Hide keyboard
function hideKeyboard() {
  if (!isKeyboardRendered)
    return;

  IMERender.hideIME();
  deactivateInputMethod();

  isKeyboardRendered = false;
}

// Resize event handler
function onResize() {
  if (IMERender.ime.dataset.hidden)
    return;

  IMERender.resizeUI(currentLayout);
  updateTargetWindowHeight(); // this case is not captured by the mutation
  // observer so we handle it apart

  // TODO: need to check how to handle orientation change case to
  // show corrent word suggestions
  updateLayoutParams();
}

// Load a special IMEngine (not a usual keyboard but a special IMEngine such
// as Chinese or Japanese)
function loadKeyboard(name) {
  var keyboard = Keyboards[name];
  if (keyboard.imEngine)
    loadIMEngine(name);
}

function loadIMEngine(name, callback) {
  var keyboard = Keyboards[name];
  var sourceDir = './js/imes/';
  var imEngine = keyboard.imEngine;

  // Same IME Engine could be load by multiple keyboard layouts
  // keep track of it by adding a placeholder to the registration point
  if (InputMethods[imEngine]) {
    if (callback)
      callback();
    return;
  }

  var script = document.createElement('script');
  script.src = sourceDir + imEngine + '/' + imEngine + '.js';

  // glue is an object that lets the input method interact with the keyboard
  var glue = {
    path: sourceDir + imEngine,
    sendCandidates: function kc_glue_sendCandidates(candidates) {
      currentCandidates = candidates;
      IMERender.showCandidates(candidates);
    },
    setComposition: function kc_glue_setComposition(symbols, cursor) {
      cursor = cursor || symbols.length;
      inputContext.setComposition(symbols, cursor);
    },
    endComposition: function kc_glue_endComposition(text) {
      text = text || '';
      inputContext.endComposition(text);
    },
    sendKey: sendKey,
    sendString: function kc_glue_sendString(str) {
      for (var i = 0; i < str.length; i++)
        sendKey(str.charCodeAt(i));
    },
    alterKeyboard: function kc_glue_alterKeyboard(keyboard) {
      renderKeyboard(keyboard);
    },
    setLayoutPage: setLayoutPage,
    setUpperCase: setUpperCase,
    resetUpperCase: resetUpperCase,
    replaceSurroundingText: replaceSurroundingText,
    getNumberOfCandidatesPerRow:
      IMERender.getNumberOfCandidatesPerRow.bind(IMERender)
  };

  script.addEventListener('load', function IMEngineLoaded() {
    var engine = InputMethods[imEngine];
    engine.init(glue);
    if (callback)
      callback();
  });

  document.body.appendChild(script);
}

// If the input method cares about layout details, get those details
// from the renderer and pass them on to the input method. This is called
// from renderKeyboard() each time the keyboard layout changes.
// As an optimzation, however, we only send parameters if layoutPage is
// the default, since the input methods we support don't do anything special
// for symbols
function updateLayoutParams() {
  if (inputMethod.setLayoutParams &&
      layoutPage === LAYOUT_PAGE_DEFAULT) {
    inputMethod.setLayoutParams({
      keyboardWidth: IMERender.getWidth(),
      keyboardHeight: getKeyCoordinateY(IMERender.getHeight()),
      keyArray: IMERender.getKeyArray(),
      keyWidth: IMERender.getKeyWidth(),
      keyHeight: IMERender.getKeyHeight()
    });
  }
}

function triggerFeedback(isSpecialKey) {
  if (vibrationEnabled) {
    try {
      navigator.vibrate(50);
    } catch (e) {}
  }

  if (clickEnabled && isSoundEnabled) {
    (isSpecialKey ? specialClicker : clicker).cloneNode(false).play();
  }
}

// Utility functions
function getWindowTop(obj) {
  var top;
  top = obj.offsetTop;
  while (!!(obj = obj.offsetParent)) {
    top += obj.offsetTop;
  }
  return top;
}

function getWindowLeft(obj) {
  var left;
  left = obj.offsetLeft;
  while (!!(obj = obj.offsetParent)) {
    left += obj.offsetLeft;
  }
  return left;
}

//
// getSettings: Query the value of multiple settings at once.
//
// settings is an object whose property names are the settings to query
// and whose property values are the default values to use if no such
// setting is found.  This function will create a setting lock and
// request the value of each of the specified settings.  Once it receives
// a response to all of the queries, it passes all the settings values to
// the specified callback function.  The argument to the callback function
// is an object just like the settings object, where the property name is
// the setting name and the property value is the setting value (or the
// default value if the setting was not found).
//
function getSettings(settings, callback) {
  var results = {};
  try {
    var lock = navigator.mozSettings.createLock();
  }
  catch (e) {
    // If settings is broken, just return the default values
    console.warn('Exception in mozSettings.createLock():', e,
                 '\nUsing default values');
    for (var p in settings)
      results[p] = settings[p];
    callback(results);
  }
  var settingNames = Object.keys(settings);
  var numSettings = settingNames.length;
  var numResults = 0;

  for (var i = 0; i < numSettings; i++) {
    requestSetting(settingNames[i]);
  }

  function requestSetting(name) {
    try {
      var request = lock.get(name);
    }
    catch (e) {
      console.warn('Exception querying setting', name, ':', e,
                   '\nUsing default value');
      recordResult(name, settings[name]);
      return;
    }
    request.onsuccess = function() {
      var value = request.result[name];
      if (value === undefined)
        value = settings[name]; // Use the default value
      recordResult(name, value);
    };
    request.onerror = function(evt) {
      console.warn('Error querying setting', name, ':', evt.error);
      recordResult(name, settings[name]);
    };
  }

  function recordResult(name, value) {
    results[name] = value;
    numResults++;
    if (numResults === numSettings) {
      callback(results);
    }
  }
}

// To determine if the candidate panel for word suggestion is needed
function needsCandidatePanel() {
  return !!((Keyboards[keyboardName].autoCorrectLanguage ||
           Keyboards[keyboardName].needsCandidatePanel) &&
          (!inputMethod.displaysCandidates ||
           inputMethod.displaysCandidates()));
}

/*
 * This is a helper to scroll the keyboard layout menu when the touch moves near
 * the edge of the top or bottom of the menu
 *
 */
var KeyboardMenuScroll = {

  currentCoords: null,
  scrollTimeout: null,

  reset: function kms_reset() {
    this.currentCoords = null;
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = null;
  },

  scrollKeyboardMenu: function kms_scrollKeyboardMenu(target, coords) {
    var keyboardMenu = target.parentNode;
    var menuTop = getWindowTop(keyboardMenu);
    var menuBottom = menuTop + keyboardMenu.offsetHeight;

    var TIMEOUT_FOR_NEXT_SCROLL = 30;

    var scrollThreshold = keyboardMenu.firstElementChild.offsetHeight;
    var scrollStep = scrollThreshold * 5 / (1000 / TIMEOUT_FOR_NEXT_SCROLL);
    this.currentCoords = coords;

    function scroll(delta) {

      // Stop the scrolling if the user presses the power button or home button
      if (document.hidden)
        return false;

      var origScrollTop = keyboardMenu.scrollTop;
      keyboardMenu.scrollTop += delta;

      return (origScrollTop != keyboardMenu.scrollTop);
    }

    function doScroll() {
      if (!this.currentCoords) {
        return;
      }

      var scrolled = false;
      if (Math.abs(this.currentCoords.pageY - menuTop) < scrollThreshold) {
        scrolled = scroll(-scrollStep);
      } else if (Math.abs(this.currentCoords.pageY - menuBottom) <
                 scrollThreshold) {
        scrolled = scroll(scrollStep);
      }

      if (scrolled)
        this.scrollTimeout = window.setTimeout(doScroll.bind(this),
                                               TIMEOUT_FOR_NEXT_SCROLL);
      else
        this.scrollTimeout = null;
    }

    if (this.scrollTimeout) {
      return;
    }

    // Add a delay so that it will not start scrolling down
    // when you move upwards from language switching button
    this.scrollTimeout = window.setTimeout(doScroll.bind(this), 100);
 }
};
