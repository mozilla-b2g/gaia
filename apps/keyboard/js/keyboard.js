/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*
 * keyboard.js:
 *
 * This is the main module of the Gaia keyboard app. It does these things:
 *
 * - Hides and shows the keyboard in response to focuschange events from
 *   navigator.mozKeyboard
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
 *   them into synthetic key events using the navigator.mozKeyboard API.
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
 *    init(keyboard)
 *      keyboard is the object that the IM uses to communicate with the keyboard
 *
 *    activate(language, suggestionsEnabled, inputstate)
 *      the keyboard calls this method when it becomes active.
 *      language is the current language.  suggestionsEnabled
 *      specifies whether the user wants word suggestions inputstate
 *      is an object that holds the state of the input field or
 *      textarea being typed into.  it includes content, cursor
 *      position and type and inputmode attributes.
 *
 *    deactivate()
 *      called when the keyboard is hidden.
 *
 *    empty:
 *      clear any currently displayed candidates/suggestions.
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
 *    select(text, data):
 *      Called when the user selects a displayed candidate or word suggestion.
 *      The two arguments are two versions of the candidate. The distinction
 *      is important for Asian IMs but I don't understand it.
 *
 *    setLayoutParams(params):
 *
 *      Gives the IM information about the onscreen coordinates of
 *      each key. Used with latin IM only.  Can be used with click
 *      coordinates to improve predictions, but it may not currently
 *      be used.
 *
 * The init method of each IM is passed an object that it uses to
 * communicate with the keyboard. That interface object defines the following
 * properties and methods:
 *
 *    path: a url that the IM can use to load dictionaries or other resources
 *
 *    sendCandidates:
 *      A method that makes the keyboard display candidates or suggestions
 *
 *    sendPendingSymbols:
 *      like sendCandidates, but used by Asian IMs.
 *
 *    sendKey(keycode):
 *      Generate output. Typically the keyboard will just pass this
 *      keycode to mozKeyboard.sendKey(). The IM could call
 *      mozKeyboard.sendKey() directly, but doing it this way allows
 *      us to chain IMs, I think.
 *
 *    sendString:
 *      Outputs a string of text by repeated calls to sendKey().
 *
 *    alterKeyboard(layout): allows the IM to modify the keyboard layout
 *      by specifying a new layout name. Only used by asian ims currently.
 *
 *    setLayoutPage(): allows the IM to switch between default and symbol
 *      layouts on the keyboard. Used by the latin IM.
 *
 *    setUpperCase(upperCase, upperCaseLocked): allows the IM to switch between
 *    uppercase and lowercase layout on the keyboard. Used by the latin IM.
 *      upperCase: to enable the upper case or not.
 *      upperCaseLocked: to change the caps lock state.
 *
 *    resetUpperCase(): allows the IM to reset the upperCase to lowerCase
 *    without knowing the internal states like caps lock and current layout
 *    page while keeping setUpperCase simple as it is.
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

// The keyboard app can display different layouts for different languages
// We sometimes refer to these different layouts as "keyboards", so this single
// keyboard app can display many different keyboards.  The currently displayed
// keyboard is specified with setKeyboardName(). That function sets the
// following variables based on its argument.  See layout.js for a the data
// structure that maps keyboard names to their layout data.
var keyboardName;
var inputMethod = defaultInputMethod;

// These are the possible layout page values
const LAYOUT_PAGE_DEFAULT = 'Default';
const LAYOUT_PAGE_SYMBOLS_I = 'Symbols_1';
const LAYOUT_PAGE_SYMBOLS_II = 'Symbols_2';

// Layout page: what set of symbols should the keyboard display?
var layoutPage = LAYOUT_PAGE_DEFAULT;

// This object is based on the keyboard layout form layout.js, but is
// modified (see modifyLayout()) to include keys for switching keyboards
// and layouts, and type specific keys like ".com" for url keyboards.
var currentLayout = null;

var isWaitingForSecondTap = false;
var isShowingAlternativesMenu = false;
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

// Show accent char menu (if there is one) after ACCENT_CHAR_MENU_TIMEOUT
const ACCENT_CHAR_MENU_TIMEOUT = 700;

// Backspace repeat delay and repeat rate
const REPEAT_RATE = 100;
const REPEAT_TIMEOUT = 700;

// How long to wait for more focuschange events before processing
const FOCUS_CHANGE_DELAY = 20;

// Taps the shift key twice within CAPS_LOCK_TIMEOUT
// to lock the keyboard at upper case state.
const CAPS_LOCK_TIMEOUT = 450;

// timeout and interval for delete, they could be cancelled on mouse over
var deleteTimeout = 0;
var deleteInterval = 0;
var menuTimeout = 0;

// This object has one property for each keyboard layout setting.
// If the user turns on that setting in the settings app, the value of
// the property specifies the keyboard layouts that are enabled.
const keyboardGroups = {
  'english': ['en'],
  'dvorak': ['en-Dvorak'],
  'spanish' : ['es'],
  'portuguese' : ['pt_BR'],
  'polish' : ['pl'],
  'otherlatins': ['cz', 'fr', 'de', 'nb', 'sk', 'tr'],
  'cyrillic': ['ru', 'sr-Cyrl'],
  'hebrew': ['he'],
  'zhuyin': ['zh-Hant-Zhuyin'],
  'pinyin': ['zh-Hans-Pinyin'],
  'arabic': ['ar'],
  'greek': ['el'],
  'japanese': ['jp-kanji']
};

// This is the default keyboard if none is selected in settings
// XXX: switch this to pt-BR?
const defaultKeyboardNames = ['en'];

// If we get a focuschange event from mozKeyboard for an element with
// one of these types, we'll just ignore it.
const ignoredFormElementTypes = {
  'select-one': true,
  'select-multiple': true,
  'date': true,
  'time': true,
  'datetime': true,
  'datetime-local': true
};

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
var userLanguage;
var suggestionsEnabled;
var clickEnabled;
var vibrationEnabled;
var enabledKeyboardGroups;
var enabledKeyboardNames;
var isSoundEnabled;

// data URL for keyboard click sound
const CLICK_SOUND = 'data:audio/x-wav;base64,' +
  'UklGRiADAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YfwCAAAW/Fzsqe9O' +
  'AONWB0Pt3Mf1hsS38mJcc0mq9mzpwsIwsChOBxay/ikHV6Tr8ioJNQa0ErvFzbXrw97j' +
  '5C2LQII7aBg77Tr+I+wH0QWp/7xowHegIf0yD1UkhzRRIbUGoeOgJptCHVB+WZg5ehgs' +
  'EcofKwKaAb7+cuzd9doICAx0FZEm+gEq+z//D/yJDtEJx/O73MHkifPK/BoLXwwuBt3p' +
  '5eBq2h3YT/OR+MH/5xDGB7sHowyp9rrrL++06mnt/PpcALcI7RDSCz4GwwWaAXYNVhLw' +
  'D20VYQsvCWUPxApJCVUH3P0jA54EIP0RBUYHVgtlD68KtQWI/9MB4f8Q/Fr4UvLz7nPq' +
  'yOzV9AvzKfEB7azl/+ee6jbrSOw16mjpPepD7d3yT/hL/RIDBAXQAHcDIAZ1BVsPIhAZ' +
  'CT4Ntwc2CJsQnhV+GlYcJR67GF0WaRK5CewGSQdSBboCfgWGBaQACP0e+8f3O/Y4+Yn1' +
  '4e8l9Mf3lvns/eT75fbx9t359/lw+6L+XP+5AdsFSgZECK8LvQlVCWYJ1wetBD8AGALl' +
  'AJUAVAbPBEkDpALfADn/Cv4c/+7+OP/jAAb/7vie+Xr7GvYa9g30rPBc9OL1wveo+3D+' +
  '8/xG+Zn5tPsi/vX/xv4I/Oj5DPaL8mbxmfMM+80AXQbiCisNvhC8Dt4LGwwyDJkNlAxR' +
  'CWYGswcHCn0KyA5cDsQKYgrZB+cFlATlAh4A3P5kAOsAOwLbA+ED8gLAAM/+h/vq+Lb5' +
  'qPgY+GH5i/nE+SX6V/s9+gv69vl89nv33fhc+Zb6nvse/lEA4wMjBrQEugPc/4/8pvux' +
  '+//9Kf9tAGcBXAFxAtgCuwMeBFQE6AQdA4gCGAJiADsAuwC7/53+a/4J/tv88fte+R74' +
  'dPhd+HD5LPmf+If5VPsp/noASALRAbsB+wJ+Ak0CuQPiBAsFpwYTB5wFtgZ/DE4P8AuH' +
  'B4kD3QKPBcAHhgaHBDAEngO6BBcFbwJ2/qD7rPtG/voBwQGU/pn9Lv3T/g==';

// The audio element used to play the click sound
var clicker;

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

// The first thing we do when the keyboard app loads is query all the
// keyboard-related settings. Only once we have the current settings values
// do we initialize the rest of the keyboard
window.addEventListener('load', getKeyboardSettings);

function getKeyboardSettings() {
  // Before we can initialize the keyboard we need to know the current
  // value of all keyboard-related settings. These are two of the settings
  // we want to query, with the default value we'll use
  var settingsQuery = {
    'language.current': 'en-US',
    'keyboard.wordsuggestion': true,
    'keyboard.vibration': false,
    'keyboard.clicksound': false,
    'ring.enabled': true
  };

  // Add the keyboard group settings to our query, too.
  for (var group in keyboardGroups)
    settingsQuery['keyboard.layouts.' + group] = false;

  // Now query the settings
  getSettings(settingsQuery, function gotSettings(values) {

    // Copy settings values to the corresponding global variables.
    userLanguage = values['language.current'];
    suggestionsEnabled = values['keyboard.wordsuggestion'];
    vibrationEnabled = values['keyboard.vibration'];
    clickEnabled = values['keyboard.clicksound'];
    isSoundEnabled = values['ring.enabled'];

    handleKeyboardSound();

    // Copy the keyboard group settings too
    enabledKeyboardGroups = {};
    for (var group in keyboardGroups) {
      var settingName = 'keyboard.layouts.' + group;
      enabledKeyboardGroups[settingName] = values[settingName];
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
  navigator.mozSettings.addObserver('language.current', function(e) {
    // The keyboard won't be displayed when this setting changes, so we
    // don't need to tell the keyboard about the new value right away.
    // We pass the value to the input method when the keyboard is displayed.
    userLanguage = e.settingValue;
  });

  navigator.mozSettings.addObserver('keyboard.wordsuggestion', function(e) {
    // The keyboard won't be displayed when this setting changes, so we
    // don't need to tell the keyboard about the new value right away.
    // We pass the value to the input method when the keyboard is displayed
    suggestionsEnabled = e.settingValue;
  });

  navigator.mozSettings.addObserver('keyboard.vibration', function(e) {
    vibrationEnabled = e.settingValue;
  });

  navigator.mozSettings.addObserver('ring.enabled', function(e) {
    isSoundEnabled = e.settingValue;
    handleKeyboardSound();
  });

  navigator.mozSettings.addObserver('keyboard.clicksound', function(e) {
    clickEnabled = e.settingValue;
    handleKeyboardSound();
  });

  for (var group in keyboardGroups) {

    var settingName = 'keyboard.layouts.' + group;

    var createLayoutCallback = function createLayoutCallback(name) {
      return function layoutCallback(e) {
        enabledKeyboardGroups[name] = e.settingValue;
        handleNewKeyboards();
      }
    };

    navigator.mozSettings.addObserver(settingName,
                                      createLayoutCallback(settingName));
  }

  // Initialize the rendering module
  IMERender.init(getUpperCaseValue, isSpecialKeyObj);

  // Attach event listeners to the element that does rendering
  for (var event in eventHandlers) {
    IMERender.ime.addEventListener(event, eventHandlers[event]);
  }

  dimensionsObserver = new MutationObserver(function() {
    updateTargetWindowHeight();
  });

  // And observe mutation events on the renderer element
  dimensionsObserver.observe(IMERender.ime, {
    childList: true, // to detect changes in IMEngine
    attributes: true, attributeFilter: ['class', 'style', 'data-hidden']
  });

  // Show or hide the keyboard when we get an focuschange event
  // from the keyboard
  var focusChangeTimeout = 0;
  navigator.mozKeyboard.onfocuschange = function onfocuschange(evt) {
    var state = evt.detail;
    var type = state.type;

    // Skip the <select> element and inputs with type of date/time,
    // handled in system app for now
    if (!type || type in ignoredFormElementTypes)
      return;

    // We can get multiple focuschange events in rapid succession
    // so wait a bit before responding to see if we get another.
    clearTimeout(focusChangeTimeout);
    focusChangeTimeout = setTimeout(function switchKeyboard() {
      if (type === 'blur') {
        hideKeyboard();
      } else {
        showKeyboard(state);
      }
    }, FOCUS_CHANGE_DELAY);
  };

  // Handle resize events
  window.addEventListener('resize', onResize);
}

function handleKeyboardSound() {
  if (clickEnabled && isSoundEnabled) {
    clicker = new Audio(CLICK_SOUND);
  } else {
    clicker = null;
  }
}

function setKeyboardName(name) {
  var keyboard = Keyboards[name];
  if (!keyboard) {
    console.warn('Unknown keyboard name', name);
    return;
  }

  keyboardName = name;
  if (keyboard.imEngine)
    inputMethod = InputMethods[keyboard.imEngine];

  if (!inputMethod)
    inputMethod = defaultInputMethod;

  // Tell the renderer what input method we're using. This will set a CSS
  // classname that can be used to style the keyboards differently
  IMERender.setInputMethodName(keyboard.imEngine || 'default');
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
    if (enabledKeyboardGroups['keyboard.layouts.' + group])
      Array.prototype.push.apply(enabledKeyboardNames,
                                 keyboardGroups[group]);
  }

  // If no keyboards were selected, use a default
  if (enabledKeyboardNames.length === 0)
    Array.prototype.push.apply(enabledKeyboardNames,
                               defaultKeyboardNames);


  // Now load each of these keyboards and their input methods
  for (var i = 0; i < enabledKeyboardNames.length; i++)
    loadKeyboard(enabledKeyboardNames[i]);

  // Set the current keyboard to null. Later, when the input methods have
  // loaded, and the user tries to display a keyboard we'll
  // initialize the first enabled keyboard and its input method.
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

  return null;
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
  if (currentInputType === 'tel')
    altLayoutName = currentInputType + 'Layout';
  else if (currentInputType === 'number')
    altLayoutName =
      currentInputMode === 'digits' ? 'pinLayout' : 'numberLayout';
  else if (layoutPage === LAYOUT_PAGE_SYMBOLS_I)
    altLayoutName = 'alternateLayout';
  else if (layoutPage === LAYOUT_PAGE_SYMBOLS_II)
    altLayoutName = 'symbolLayout';

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

    // switch languages button
    if (enabledKeyboardNames.length > 1 && !layout['hidesSwitchKey']) {
      space.ratio -= 1;
      row.splice(c, 0, {
        value: '&#x1f310;',
        ratio: 1,
        keyCode: SWITCH_KEYBOARD
      });
      c += 1;
    }

    // Alternate layout key
    // This gives the author the ability to change the alternate layout
    // key contents
    var alternateLayoutKey = '?123';
    if (layout['alternateLayoutKey']) {
      alternateLayoutKey = layout['alternateLayoutKey'];
    }

    // This gives the author the ability to change the basic layout
    // key contents
    var basicLayoutKey = 'ABC';
    if (layout['basicLayoutKey']) {
      basicLayoutKey = layout['basicLayoutKey'];
    }

    if (!layout['disableAlternateLayout']) {
      space.ratio -= 2;
      if (layoutPage === LAYOUT_PAGE_DEFAULT) {
        row.splice(c, 0, {
          keyCode: ALTERNATE_LAYOUT,
          value: alternateLayoutKey,
          ratio: 2
        });

      } else {
        row.splice(c, 0, {
          keyCode: BASIC_LAYOUT,
          value: basicLayoutKey,
          ratio: 2
        });
      }
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
        var next = c + 1;
        if (overwrites['.'] !== false) {
          space.ratio -= 1;
          next = c + 2;
        }
        if (overwrites[','] !== false)
          space.ratio -= 1;

        if (overwrites[',']) {
          row.splice(c, 0, {
            value: overwrites[','],
            ratio: 1,
            keyCode: overwrites[','].charCodeAt(0)
          });
        } else if (overwrites[','] !== false) {
          row.splice(c, 0, {
            value: ',',
            ratio: 1,
            keyCode: 44
          });
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

  // update settings with keyboard layout, e.me uses this to improve searches
  updateSettings('current', keyboardName);

  // And draw the layout
  IMERender.draw(currentLayout, {
    uppercase: isUpperCase,
    inputType: currentInputType,
    showCandidatePanel: Keyboards[keyboardName].needsCandidatePanel
  });

  IMERender.setUpperCaseLock(isUpperCaseLocked ? 'locked' : isUpperCase);

  // If needed, empty the candidate panel
  if (inputMethod.empty)
    inputMethod.empty();

  // Tell the input method about the new keyboard layout
  updateLayoutParams();
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

  // When case changes we have to re-render the keyboard.
  // But note that we don't have to relayout the keyboard, so
  // we call draw() directly instead of renderKeyboard()
  IMERender.draw(currentLayout, {
    uppercase: isUpperCaseLocked || isUpperCase,
    inputType: currentInputType,
    showCandidatePanel: Keyboards[keyboardName].needsCandidatePanel
  });
  // And make sure the caps lock key is highlighted correctly
  IMERender.setUpperCaseLock(isUpperCaseLocked ? 'locked' : isUpperCase);
}

function updateSettings(key, value) {
  var settings = {};
  settings['keyboard.' + key] = value;

  try {
    var lock = navigator.mozSettings.createLock();
    lock.set(settings);
  } catch (ex) {}
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
  if (IMERender.ime.dataset.hidden || hide) {
    document.location.hash = 'hide';
  } else {
    document.location.hash = 'show=' + IMERender.ime.scrollHeight;
  }
}

function notifyShowKeyboard(show) {
  updateTargetWindowHeight(!show);
}

// Sends a delete code to remove last character
// The argument specifies whether this is an auto repeat or not.
// We call triggerFeedback() for the initial press, but we
// purposefully do not call it again for auto repeating delete.
function sendDelete(isRepeat) {
  // Pass the isRepeat argument to the input method. It may not want
  // to compute suggestions, for example, if this is just one in a series
  // of repeating events.
  inputMethod.click(KeyboardEvent.DOM_VK_BACK_SPACE,
                    undefined, undefined, isRepeat);
}

// Return the upper value for a key object
function getUpperCaseValue(key) {
  var hasSpecialCode = specialCodes.indexOf(key.keyCode) > -1;
  if (key.keyCode < 0 || hasSpecialCode || key.compositeKey)
    return key.value;

  var upperCase = currentLayout.upperCase || {};
  var v = upperCase[key.value] || key.value.toUpperCase();
  return v;
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
  var alternatives, altMap, value, keyObj, uppercaseValue;
  var r = key ? key.dataset.row : -1, c = key ? key.dataset.column : -1;
  if (r < 0 || c < 0 || r === undefined || c === undefined)
    return;
  keyObj = currentLayout.keys[r][c];

  // Handle languages alternatives
  if (keyObj.keyCode === SWITCH_KEYBOARD) {
    IMERender.showKeyboardAlternatives(
      key,
      enabledKeyboardNames,
      keyboardName,
      SWITCH_KEYBOARD
    );
    isShowingAlternativesMenu = true;
    return;
  }

  // Handle key alternatives
  altMap = currentLayout.alt || {};
  value = keyObj.value;
  alternatives = altMap[value] || '';

  // If in uppercase, look for other alternatives or use default's
  if (isUpperCase) {
    uppercaseValue = getUpperCaseValue(keyObj);
    alternatives = altMap[uppercaseValue] || alternatives.toUpperCase();
  }

  // Split alternatives
  if (alternatives.indexOf(' ') != -1) {
    alternatives = alternatives.split(' ');

    // Check just one item
    if (alternatives.length === 2 && alternatives[1] === '')
      alternatives.pop();

  } else {
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
  });
}

function onTouchMove(evt) {
  // Prevent a mouse event from firing
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
  evt.preventDefault();
  touchCount = evt.touches.length;

  handleTouches(evt, function handleTouchEnd(touch, touchId) {
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
    endPress(touchedKeys[touchId].target, touch, touchId);
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

  // Feedback
  IMERender.highlightKey(target);
  triggerFeedback();

  setMenuTimeout(target, coords, touchId);

  var keyCode = parseInt(target.dataset.keycode);

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


function inMenuLockedArea(coords) {
  return (menuLockedArea &&
          coords.pageY >= menuLockedArea.top &&
          coords.pageY <= menuLockedArea.bottom &&
          coords.pageX >= menuLockedArea.left &&
          coords.pageX <= menuLockedArea.right);
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
  if (isShowingAlternativesMenu && inMenuLockedArea(coords)) {
    var menuChildren = IMERender.menu.children;
    var redirectTarget = menuChildren[Math.floor(
      (coords.pageX - menuLockedArea.left) / menuLockedArea.ratio)];

    target = redirectTarget;
  }

  var oldTarget = touchEventsPresent ? touchedKeys[touchId].target : currentKey;

  // Do nothing if there are invalid targets, if the user is touching the
  // same key, or if the new target is not a normal key.
  if (!target || !oldTarget || oldTarget == target || !isNormalKey(target))
    return;

  // Update highlight: remove from older
  IMERender.unHighlightKey(oldTarget);

  var keyCode = parseInt(target.dataset.keycode);

  // Ignore if moving over delete key
  if (keyCode == KeyEvent.DOM_VK_BACK_SPACE) {
    // Set currentKey to null so that no key is entered in this case.
    // Except when the current key is actually backspace itself. Then we
    // need to leave currentKey alone, so that autorepeat works correctly.
    if (parseInt(oldTarget.dataset.keycode) !== keyCode)
      setCurrentKey(null, touchId);
    return;
  }

  // Update highlight: add to the new
  IMERender.highlightKey(target);
  setCurrentKey(target, touchId);

  clearTimeout(deleteTimeout);
  clearInterval(deleteInterval);
  clearTimeout(menuTimeout);

  // Hide of alternatives menu if the touch moved out of it
  if (target.parentNode !== IMERender.menu &&
      isShowingAlternativesMenu &&
      !inMenuLockedArea(coords))
    hideAlternatives();

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
function endPress(target, coords, touchId) {
  clearTimeout(deleteTimeout);
  clearInterval(deleteInterval);
  clearTimeout(menuTimeout);

  hideAlternatives();

  if (!target || !isNormalKey(target))
    return;

  // IME candidate selected
  var dataset = target.dataset;
  if (dataset.selection) {

    if (inputMethod.select) {
      inputMethod.select(target.textContent, dataset.data);
    }

    IMERender.highlightKey(target);
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

  // Handle composite key (key that sends more than one code)
  var sendCompositeKey = function sendCompositeKey(compositeKey) {
    compositeKey.split('').forEach(function sendEachKey(key) {
      window.navigator.mozKeyboard.sendKey(0, key.charCodeAt(0));
    });
  };

  var compositeKey = target.dataset.compositekey;
  if (compositeKey) {
    sendCompositeKey(compositeKey);
    return;
  }

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

    // If the user has specify a keyboard in the menu,
    // switch to that keyboard.
    if (target.dataset.keyboard) {
      setKeyboardName(target.dataset.keyboard);

      // If the user is releasing the switch keyboard key while
      // showing the alternatives, do nothing.
    } else if (isShowingAlternativesMenu) {
      break;

      // Cycle between languages (keyboard)
    } else {
      var keyboards = enabledKeyboardNames;
      var index = keyboards.indexOf(keyboardName);
      index = (index + 1) % keyboards.length;
      setKeyboardName(enabledKeyboardNames[index]);
    }

    resetKeyboard();

    /*
     * XXX
     * If we switch to a different keyboard that has a different input
     * method, we need to call activate() again to set up the state for that
     * input method. But we can only get the state we need when we get a
     * focuschange event. This means that keyboard switching only works
     * when the keyboards have the same input method.
     * So to switch from a latin to an asian keyboard, you'd have to
     * lose focus and then refocus the input field.  In practice, I think
     * that asian keyboards have input methods that handle the latin case
     * so this probably isn't an issue.
    if (inputMethod.activate) {
      inputMethod.activate(userLanguage, suggestionsEnabled, currentInputType);
    }
    */
    break;

    // Expand / shrink the candidate panel
  case TOGGLE_CANDIDATE_PANEL:
    if (IMERender.ime.classList.contains('candidate-panel')) {
      IMERender.ime.classList.remove('candidate-panel');
      IMERender.ime.classList.add('full-candidate-panel');
    } else {
      IMERender.ime.classList.add('candidate-panel');
      IMERender.ime.classList.remove('full-candidate-panel');
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
    var offset = getOffset(target, coords);
    inputMethod.click(keyCode, offset.x, getKeyCoordinateY(offset.y));
    break;
  }
}

function getKeyCoordinateY(y) {
  var candidatePanel = document.getElementById('keyboard-candidate-panel');

  var yBias = 0;
  if (candidatePanel)
    yBias = candidatePanel.clientHeight;

  return y - yBias;
}

function getOffset(el, coords) {
  var x = 0;
  var y = 0;

  while (el) {
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }

  x = coords.clientX - x;
  y = coords.clientY - y;

  return { x: x, y: y };
}

// Turn to default values
function resetKeyboard() {
  // Don't call setLayoutPage because we call renderKeyboard() below
  layoutPage = LAYOUT_PAGE_DEFAULT;
  // Don't call setUpperCase because we call renderKeyboard() below
  isUpperCase = false;
  isUpperCaseLocked = false;

  renderKeyboard(keyboardName);

  IMERender.setUpperCaseLock(isUpperCase);
}

// This is a wrapper around mozKeyboard.sendKey()
// We use it in the defaultInputMethod and in the interface object
// we pass to real input methods
function sendKey(keyCode) {
  switch (keyCode) {
  case KeyEvent.DOM_VK_BACK_SPACE:
  case KeyEvent.DOM_VK_RETURN:
    window.navigator.mozKeyboard.sendKey(keyCode, 0);
    break;

  default:
    window.navigator.mozKeyboard.sendKey(0, keyCode);
    break;
  }
}

// Set up the keyboard and its input method.
// This is called when we get an event from mozKeyboard.
// The state argument is the data passed with that event, and includes
// the input field type, its inputmode, its content, and the cursor position.
function showKeyboard(state) {
  // If no keyboard has been selected yet, choose the first enabled one.
  // This will also set the inputMethod
  if (!keyboardName)
    setKeyboardName(enabledKeyboardNames[0]);

  IMERender.showIME();

  currentInputMode = state.inputmode;
  currentInputType = mapInputType(state.type);
  resetKeyboard();

  if (inputMethod.activate) {
    inputMethod.activate(userLanguage, suggestionsEnabled, state);
  }

  if (!inputMethod.displaysCandidates ||
      inputMethod.displaysCandidates())
  {
    IMERender.ime.classList.add('candidate-panel');
  }
  else {
    IMERender.ime.classList.remove('candidate-panel');
  }
  IMERender.ime.classList.remove('full-candidate-panel');

}

// Hide keyboard
function hideKeyboard() {
  IMERender.hideIME();
  if (inputMethod.deactivate)
    inputMethod.deactivate();
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

function loadIMEngine(name) {
  var keyboard = Keyboards[name];
  var sourceDir = './js/imes/';
  var imEngine = keyboard.imEngine;

  // Same IME Engine could be load by multiple keyboard layouts
  // keep track of it by adding a placeholder to the registration point
  if (InputMethods[imEngine])
    return;

  var script = document.createElement('script');
  script.src = sourceDir + imEngine + '/' + imEngine + '.js';

  // glue is an object that lets the input method interact with the keyboard
  var glue = {
    path: sourceDir + imEngine,
    sendCandidates: function kc_glue_sendCandidates(candidates) {
      IMERender.showCandidates(candidates);
    },
    sendPendingSymbols:
    function kc_glue_sendPendingSymbols(symbols,
                                        highlightStart,
                                        highlightEnd,
                                        highlightState) {

      IMERender.showPendingSymbols(
        symbols,
        highlightStart, highlightEnd, highlightState
      );
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
    resetUpperCase: resetUpperCase
  };

  script.addEventListener('load', function IMEngineLoaded() {
    var engine = InputMethods[imEngine];
    engine.init(glue);
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

function triggerFeedback() {
  if (vibrationEnabled) {
    try {
      navigator.vibrate(50);
    } catch (e) {}
  }

  if (clickEnabled && isSoundEnabled) {
    clicker.cloneNode(false).play();
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
