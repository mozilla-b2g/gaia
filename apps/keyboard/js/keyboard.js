/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * @fileoverview Keyboard Overview.
 *
 * **keyboard.js**:
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
 *  * **layout.js**: defines data structures that represent keyboard layouts
 *  * **render.js**: creates the on-screen keyboard with HTML and CSS
 *
 */

'use strict';

// A timer for time measurement
// XXX: render.js is using this variable from other script.
var perfTimer = new PerformanceTimer();
perfTimer.start();
perfTimer.printTime('keyboard.js');

var inputContext = null;

// The keyboard app can display different layouts for different languages
// We sometimes refer to these different layouts as "keyboards", so this single
// keyboard app can display many different keyboards.  The currently displayed
// keyboard is specified with updateCurrentLayout(). That function sets the
// following variables based on its argument.
//
// See keyboard/layouts for layout data.
//
// The keyboardName is always the URL hash this page loaded with.
// updateCurrentLayout() is called when pages loads, when visibility changes,
// and when URL hash changes.
var keyboardName = null;

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
var isKeyboardRendered = false;
var currentCandidates = [];
var candidatePanelScrollTimer = null;

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

// Time we wait after blur to hide the keyboard
// in case we get a focus event right after
const HIDE_KEYBOARD_TIMEOUT = 500;

// timeout and interval for delete, they could be cancelled on mouse over
var deleteTimeout = 0;
var deleteInterval = 0;
var menuTimeout = 0;
var hideKeyboardTimeout = 0;

// Special key codes
const BASIC_LAYOUT = -1;
const ALTERNATE_LAYOUT = -2;
const SWITCH_KEYBOARD = -3;
const TOGGLE_CANDIDATE_PANEL = -4;
const NO_OP = -5;

const specialCodes = [
  KeyEvent.DOM_VK_BACK_SPACE,
  KeyEvent.DOM_VK_CAPS_LOCK,
  KeyEvent.DOM_VK_RETURN,
  KeyEvent.DOM_VK_ALT,
  KeyEvent.DOM_VK_SPACE
];

// InputMethodManager is responsible of loading/activating input methods.
// XXX: For now let's pass a fake app object.
var fakeAppObject = {
  sendCandidates: function kc_glue_sendCandidates(candidates) {
    perfTimer.printTime('glue.sendCandidates');
    currentCandidates = candidates;
    IMERender.showCandidates(candidates);
  },
  setComposition: function kc_glue_setComposition(symbols, cursor) {
    perfTimer.printTime('glue.setComposition');
    cursor = cursor || symbols.length;
    inputContext.setComposition(symbols, cursor);
  },
  endComposition: function kc_glue_endComposition(text) {
    perfTimer.printTime('glue.endComposition');
    text = text || '';
    inputContext.endComposition(text);
  },
  sendKey: sendKey,
  alterKeyboard: function kc_glue_alterKeyboard(keyboard) {
    renderKeyboard(keyboard);
  },
  setLayoutPage: setLayoutPage,
  setUpperCase: setUpperCase,
  resetUpperCase: resetUpperCase,
  isCapitalized: isCapitalized,
  replaceSurroundingText: replaceSurroundingText,
  getNumberOfCandidatesPerRow:
    IMERender.getNumberOfCandidatesPerRow.bind(IMERender)
};
var inputMethodManager = new InputMethodManager(fakeAppObject);
inputMethodManager.start();

// LayoutManager loads and holds layout layouts for us.
// It also help us ensure there is only one current layout at the time.
var layoutManager = new LayoutManager();
layoutManager.start();
var layoutLoader = layoutManager.loader;

// SettingsPromiseManager wraps Settings DB methods into promises.
var settingsPromiseManager = new SettingsPromiseManager();

// L10nLoader loads l10n.js. We call it's one and only load() method
// only after we have run everything in the critical cold launch path.
var l10nLoader = new L10nLoader();

// User settings (in Settings database) are tracked within these modules
var soundFeedbackSettings;
var vibrationFeedbackSettings;
var imEngineSettings;

// We keep this promise in the global scope for the time being,
// so they can be called as soon as we need it to.
var inputContextGetTextPromise;

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

// For tracking "scrolling the full candidate panel".
var touchStartCoordinate;

initKeyboard();

// We cannot listen to resize event right at start because of
// https://bugzil.la/1007595 ;
// only attach the event listener after 600ms.
setTimeout(function attachResizeListener() {
  perfTimer.printTime('attachResizeListener');
  // Handle resize events
  window.addEventListener('resize', onResize);
}, 2000);

function initKeyboard() {
  perfTimer.startTimer('initKeyboard');
  perfTimer.printTime('initKeyboard');
  // Getting initial settings values asynchronously,
  // Plus monitor the value when it changes.
  soundFeedbackSettings = new SoundFeedbackSettings();
  soundFeedbackSettings.promiseManager = settingsPromiseManager;
  soundFeedbackSettings.onsettingchange = handleKeyboardSound;
  soundFeedbackSettings.initSettings().then(
    handleKeyboardSound,
    function rejected() {
      console.warn('Failed to get initial sound settings.');
    });

  vibrationFeedbackSettings = new VibrationFeedbackSettings();
  vibrationFeedbackSettings.promiseManager = settingsPromiseManager;
  var vibrationInitPromise = vibrationFeedbackSettings.initSettings();
  vibrationInitPromise.catch(function rejected() {
    console.warn('Failed to get initial vibration settings.');
  });

  imEngineSettings = new IMEngineSettings();
  imEngineSettings.promiseManager = settingsPromiseManager;
  var imEngineSettingsInitPromise = imEngineSettings.initSettings();
  imEngineSettingsInitPromise.catch(function rejected() {
    console.error('Fatal Error! Failed to get initial imEngine settings.');
  });

  // Initialize the rendering module
  IMERender.init(getUpperCaseValue, isSpecialKeyObj);

  // Attach event listeners to the element that does rendering
  for (var event in eventHandlers) {
    IMERender.ime.addEventListener(event, eventHandlers[event]);
  }

  dimensionsObserver = new MutationObserver(function() {
    perfTimer.printTime('dimensionsObserver:callback');
    updateTargetWindowHeight();
  });

  // And observe mutation events on the renderer element
  dimensionsObserver.observe(IMERender.ime, {
    childList: true, // to detect changes in IMEngine
    attributes: true, attributeFilter: ['class', 'style']
  });

  window.addEventListener('hashchange', function() {
    perfTimer.printTime('hashchange');
    var layoutName = window.location.hash.substring(1);
    layoutLoader.getLayoutAsync(layoutName);
    updateCurrentLayout(layoutName);
  }, false);

  // Need to listen to both mozvisibilitychange and oninputcontextchange,
  // because we are not sure which will happen first and we will call
  // showKeyboard() when mozHidden is false and we got inputContext
  window.addEventListener('mozvisibilitychange', function visibilityHandler() {
    perfTimer.printTime('mozvisibilitychange');
    if (document.mozHidden && !inputContext) {
      hideKeyboard();

      return;
    }

    var layoutName = window.location.hash.substring(1);
    updateCurrentLayout(layoutName);
  });

  window.navigator.mozInputMethod.oninputcontextchange = function() {
    perfTimer.printTime('inputcontextchange');
    inputContext = navigator.mozInputMethod.inputcontext;
    if (inputContext) {
      inputContextGetTextPromise = inputContext.getText();
    }
    if (document.mozHidden && !inputContext) {
      hideKeyboard();

      return;
    }

    var layoutName = window.location.hash.substring(1);
    updateCurrentLayout(layoutName);
  };

  // Initialize the current layout according to
  // the hash this page is loaded with.
  var layoutName = '';
  if (window.location.hash !== '') {
    layoutName = window.location.hash.substring(1);
    layoutLoader.getLayoutAsync(layoutName);
  } else {
    console.error('This page should never be loaded without an URL hash.');

    return;
  }

  // fill inputContextGetTextPromise and inputContext
  inputContext = navigator.mozInputMethod.inputcontext;
  if (inputContext) {
    inputContextGetTextPromise = inputContext.getText();
  }

  // Finally, if we are only loaded by keyboard manager when the user
  // have already focused, the keyboard should show right away.
  updateCurrentLayout(layoutName);
}

function handleKeyboardSound(settings) {
  if (settings.clickEnabled &&
      !!settings.isSoundEnabled) {
    clicker = new Audio(CLICK_SOUND);
    specialClicker = new Audio(SPECIAL_SOUND);
  } else {
    clicker = null;
    specialClicker = null;
  }
}

function deactivateInputMethod() {
  // Switching to default IMEngine makes the current IMEngine deactivate.
  // The currentIMEngine will be set and activates again in
  // showKeyboard() (specifically, switchIMEngine()).
  inputMethodManager.switchCurrentIMEngine('default');
}

function updateCurrentLayout(name) {
  perfTimer.printTime('updateCurrentLayout');

  layoutManager.switchCurrentLayout(name).then(function() {
    perfTimer.printTime('updateCurrentLayout:promise resolved');
    keyboardName = name;
    keyboard = layoutLoader.getLayout(name);

    // Ask the loader to start loading IMEngine
    var imEngineloader = inputMethodManager.loader;
    var imEngineName = keyboard.imEngine;
    if (imEngineName && !imEngineloader.getInputMethod(imEngineName)) {
      imEngineloader.getInputMethodAsync(imEngineName);
    }

    // Now the that we have the layout ready,
    // we should either show or hide the keyboard.
    if (!document.mozHidden && inputContext) {
      showKeyboard();
    } else {
      hideKeyboard();

      // Load l10n library here, there is nothing more to do left
      // in the critical path.
      l10nLoader.load();
    }
  }, function(error) {
    console.warn('Failed to switch layout for ' + name + '.' +
      ' It might possible because we were called more than once.');
  });
}

// Support function for render
function isSpecialKeyObj(key) {
  var hasSpecialCode = key.keyCode !== KeyEvent.DOM_VK_SPACE &&
    key.keyCode &&
    specialCodes.indexOf(key.keyCode) !== -1;
  return hasSpecialCode || key.keyCode <= 0;
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

  // Test if a key has alternatives
  function hasAlternatives(layout, value) {
    if (!layout.alt)
      return false;

    return (value in layout.alt);
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
      } else if (isGreekSMS()) {
        altLayoutName = 'el-sms';
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
    layout = layoutLoader.getLayout(keyboardName)[altLayoutName] ||
      layoutLoader.getLayout(altLayoutName);
  }
  else {
    layout = layoutLoader.getLayout(keyboardName);
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
    var alternateLayoutKey = '12&';
    if (layout['alternateLayoutKey']) {
      alternateLayoutKey = layout['alternateLayoutKey'];
    }

    // This gives the author the ability to change the basic layout
    // key contents
    // 'layout' holds alternatelayout which doesn't include basicLayoutKey.
    // Check and use 'basicLayoutKey' defined by each keyboard.
    var basicLayoutKey = 'ABC';
    if (layoutLoader.getLayout(keyboardName)['basicLayoutKey']) {
      basicLayoutKey = layoutLoader.getLayout(keyboardName)['basicLayoutKey'];
    }

    if (!layout['disableAlternateLayout']) {
      space.ratio -= 1.5;
      if (layoutPage === LAYOUT_PAGE_DEFAULT) {
        row.splice(c, 0, {
          keyCode: ALTERNATE_LAYOUT,
          value: alternateLayoutKey,
          ratio: 1.5,
          ariaLabel: 'alternateLayoutKey',
          className: 'switch-key'
        });

      } else {
        row.splice(c, 0, {
          keyCode: BASIC_LAYOUT,
          value: basicLayoutKey,
          ratio: 1.5,
          ariaLabel: 'basicLayoutKey'
        });
      }
      c += 1;
    }

    // switch languages button
    var supportsSwitching = navigator.mozInputMethod.mgmt.supportsSwitching();
    var needsSwitchingKey = !layout['hidesSwitchKey'] && supportsSwitching;
    if (needsSwitchingKey) {
      var imeSwitchKey = {
        value: '&#x1f310;',
        ratio: 1,
        keyCode: SWITCH_KEYBOARD,
        className: 'switch-key'
      };

      if ('shortLabel' in layoutLoader.getLayout(keyboardName)) {
        imeSwitchKey.value = layoutLoader.getLayout(keyboardName).shortLabel;
        imeSwitchKey.className += ' alternate-indicator';
      }

      space.ratio -= 1;
      row.splice(c, 0, imeSwitchKey);
      c += 1;
    }

    // Now modify the layout some more based on the input type
    var defaultPeriodSymbol = { value: '.', ratio: 1, keyCode: 46 };
    if (hasAlternatives(layout, '.')) {
      defaultPeriodSymbol['className'] = 'alternate-indicator';
    }
    if (!layout['typeInsensitive']) {
      switch (currentInputType) {
        // adds . / and .com
      case 'url':
        space.ratio -= 2;
        row.splice(c, 0, { value: '/', ratio: 1, keyCode: 47 });
        row.splice(c + 2, 0, defaultPeriodSymbol);
        break;

        // adds @ and .
      case 'email':
        space.ratio -= 2;
        row.splice(c, 0, { value: '@', ratio: 1, keyCode: 64 });
        row.splice(c + 2, 0, defaultPeriodSymbol);
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
        if (layoutPage !== LAYOUT_PAGE_DEFAULT || !needsSwitchingKey) {
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
          var periodOverwrite = {
            value: overwrites['.'],
            ratio: 1,
            keyCode: overwrites['.'].charCodeAt(0)
          };
          if (hasAlternatives(layout, overwrites['.'])) {
            periodOverwrite['className'] = 'alternate-indicator';
          }
          row.splice(next, 0, periodOverwrite);
        } else if (overwrites['.'] !== false) {
          row.splice(next, 0, defaultPeriodSymbol);
        }

        break;
      }
    }
  } else {
    console.warn('No space key found. No special keys will be added.');
  }

  layout.keyboardName = keyboardName;
  layout.altLayoutName = altLayoutName;

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
  perfTimer.printTime('renderKeyboard');
  perfTimer.startTimer('renderKeyboard');

  // Add meta keys and type-specific keys to the base layout
  currentLayout = modifyLayout(keyboardName);

  var keyboard = layoutLoader.getLayout(keyboardName);

  IMERender.ime.classList.remove('full-candidate-panel');

  // Rule of thumb: always render uppercase, unless secondLayout has been
  // specified (for e.g. arabic, then depending on shift key)
  var needsUpperCase = currentLayout.secondLayout ?
    (isUpperCaseLocked || isUpperCase) :
    true;

  // And draw the layout
  IMERender.draw(currentLayout, {
    uppercase: needsUpperCase,
    inputType: currentInputType,
    showCandidatePanel: needsCandidatePanel()
  }, function() {
    perfTimer.printTime('IMERender.draw:callback');
    perfTimer.startTimer('IMERender.draw:callback');
    // So there are a couple of things that we want don't want to block
    // on here, so we can do it if resizeUI is fully finished
    IMERender.setUpperCaseLock(isUpperCaseLocked ? 'locked' : isUpperCase);

    // Tell the input method about the new keyboard layout
    updateLayoutParams();

    IMERender.showCandidates(currentCandidates);
    perfTimer.printTime(
      'BLOCKING IMERender.draw:callback', 'IMERender.draw:callback');
  });

  // Tell the renderer what input method we're using. This will set a CSS
  // classname that can be used to style the keyboards differently
  IMERender.setInputMethodName(keyboard.imEngine || 'default');

  // If needed, empty the candidate panel
  if (inputMethodManager.currentIMEngine.empty) {
    inputMethodManager.currentIMEngine.empty();
  }

  isKeyboardRendered = true;

  perfTimer.printTime('BLOCKING renderKeyboard', 'renderKeyboard');
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

  // When we have secondLayout, we need to force re-render on uppercase switch
  if (currentLayout.secondLayout) {
    return renderKeyboard(keyboardName);
  }

  // Otherwise we can just update only the keys we need...
  // Try to block the event loop as little as possible
  requestAnimationFrame(function() {
    perfTimer.startTimer('setUpperCase:requestAnimationFrame:callback');
    // And make sure the caps lock key is highlighted correctly
    IMERender.setUpperCaseLock(isUpperCaseLocked ? 'locked' : isUpperCase);

    //restore the previous candidates
    IMERender.showCandidates(currentCandidates);

    perfTimer.printTime(
      'BLOCKING setUpperCase:requestAnimationFrame:callback',
      'setUpperCase:requestAnimationFrame:callback');
  });
}

function resetUpperCase() {
  if (isUpperCase &&
      !isUpperCaseLocked &&
      layoutPage === LAYOUT_PAGE_DEFAULT) {
    setUpperCase(false);
  }
}

function isCapitalized() {
  return (isUpperCase || isUpperCaseLocked);
}

function setLayoutPage(newpage) {
  if (newpage === layoutPage)
    return;

  // When layout mode changes we have to re-render the keyboard
  layoutPage = newpage;

  renderKeyboard(keyboardName);

  if (inputMethodManager.currentIMEngine.setLayoutPage) {
    inputMethodManager.currentIMEngine.setLayoutPage(layoutPage);
  }
}

// Inform about a change in the displayed application via mutation observer
// http://hacks.mozilla.org/2012/05/dom-mutationobserver-reacting-to-dom-changes-without-killing-browser-performance/
function updateTargetWindowHeight(hide) {
  perfTimer.printTime('updateTargetWindowHeight');
  // height of the current active IME + 1px for the borderTop
  var imeHeight = IMERender.getHeight() + 1;
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
  inputMethodManager.currentIMEngine.click(KeyboardEvent.DOM_VK_BACK_SPACE,
                                           null,
                                           isRepeat);
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

  // Hide the keyboard
  if (keyObj.keyCode === KeyEvent.DOM_VK_SPACE) {
    dismissKeyboard();
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
  var keybounds = key.getBoundingClientRect();

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

  // Add some more properties to this locked area object that will help us
  // redirect touch events to the appropriate alternative key.
  menuLockedArea.keybounds = keybounds;
  menuLockedArea.firstAlternative =
    IMERender.menu.classList.contains('kbr-menu-left') ?
      IMERender.menu.lastElementChild :
      IMERender.menu.firstElementChild;
  menuLockedArea.boxes = [];
  var children = IMERender.menu.children;
  for (var i = 0; i < children.length; i++) {
    menuLockedArea.boxes[i] = children[i].getBoundingClientRect();
  }
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
  return keyCode || key.dataset.selection || key.dataset.compositeKey;
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

    if (touchStartCoordinate && touchStartCoordinate.touchId == touchId) {
      var dx = touch.pageX - touchStartCoordinate.pageX;
      var dy = touch.pageY - touchStartCoordinate.pageY;

      var hasCandidateScrolled = (IMERender.isFullCandidataPanelShown() &&
                                  (Math.abs(dx) > 3 || Math.abs(dy) > 3));

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

function getKeyCodeFromTarget(target) {
  return isUpperCase || isUpperCaseLocked ?
    parseInt(target.dataset.keycodeUpper, 10) :
    parseInt(target.dataset.keycode, 10);
}

// The coords object can either be a mouse event or a touch. We just expect the
// coords object to have clientX, clientY, pageX, and pageY properties.
function startPress(target, coords, touchId) {
  if (!isNormalKey(target))
    return;

  var keyCode = getKeyCodeFromTarget(target);

  // Feedback
  var isSpecialKey = specialCodes.indexOf(keyCode) >= 0 || keyCode < 0;
  triggerFeedback(isSpecialKey);
  IMERender.highlightKey(target, {
    isUpperCase: isUpperCase,
    isUpperCaseLocked: isUpperCaseLocked
  });

  setMenuTimeout(target, coords, touchId);

  // Special keys (such as delete) response when pressing (not releasing)
  // Furthermore, delete key has a repetition behavior
  if (keyCode === KeyEvent.DOM_VK_BACK_SPACE) {

    // First repetition, after a delay (with feedback)
    deleteTimeout = window.setTimeout(function() {
      sendDelete(true);

      // Second, after shorter delay (with feedback too)
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

    // If the x coordinate is between the bounds of the original key
    // then redirect to the first (or last) alternative. This is to
    // ensure that we always get the first alternative when the menu
    // first pops up.  Otherwise, loop through the children of the
    // menu and test each one. Once we have moved away from the
    // original keybounds we delete them and always loop through the children.
    if (menuLockedArea.keybounds &&
        coords.pageX >= menuLockedArea.keybounds.left &&
        coords.pageX < menuLockedArea.keybounds.right) {
      target = menuLockedArea.firstAlternative;
    }
    else {
      menuLockedArea.keybounds = null; // Do it this way from now on.
      var menuChildren = IMERender.menu.children;
      for (var i = 0; i < menuChildren.length; i++) {
        if (coords.pageX >= menuLockedArea.boxes[i].left &&
            coords.pageX < menuLockedArea.boxes[i].right) {
          break;
        }
      }
      target = menuChildren[i];
    }
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

  var keyCode = getKeyCodeFromTarget(target);

  // Update highlight: add to the new (Ignore if moving over delete key)
  if (keyCode != KeyEvent.DOM_VK_BACK_SPACE) {
    IMERender.highlightKey(target, {
      isUpperCase: isUpperCase,
      isUpperCaseLocked: isUpperCaseLocked
    });
  }

  setCurrentKey(target, touchId);

  clearTimeout(deleteTimeout);
  clearInterval(deleteInterval);
  clearTimeout(menuTimeout);

  // Hide of alternatives menu if the touch moved out of it
  if (target.parentNode !== IMERender.menu &&
      isShowingAlternativesMenu &&
      !inMenuLockedArea(menuLockedArea, coords))
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
function endPress(target, coords, touchId, hasCandidateScrolled) {
  clearTimeout(deleteTimeout);
  clearInterval(deleteInterval);
  clearTimeout(menuTimeout);

  var wasShowingKeyboardLayoutMenu = isShowingKeyboardLayoutMenu;
  hideAlternatives();

  if (target.classList.contains('dismiss-suggestions-button')) {
    if (inputMethodManager.currentIMEngine.dismissSuggestions) {
      inputMethodManager.currentIMEngine.dismissSuggestions();
    }
    return;
  }

  if (!target || !isNormalKey(target))
    return;

  // IME candidate selected
  var dataset = target.dataset;
  if (dataset.selection) {
    if (!hasCandidateScrolled) {
      IMERender.toggleCandidatePanel(false, true);

      if (inputMethodManager.currentIMEngine.select) {
        // We use dataset.data instead of target.textContent because the
        // text actually displayed to the user might have an ellipsis in it
        // to make it fit.
        inputMethodManager.currentIMEngine
          .select(target.textContent, dataset.data);
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

  var keyCode = getKeyCodeFromTarget(target);

  // Delete is a special key, it reacts when pressed not released
  if (keyCode == KeyEvent.DOM_VK_BACK_SPACE) {
    // The backspace key pressing is regarded as non-repetitive behavior.
    sendDelete(false);
    return;
  }

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
    var candidatePanel = IMERender.candidatePanel;

    if (IMERender.ime.classList.contains('candidate-panel')) {
      var doToggleCandidatePanel = function doToggleCandidatePanel() {
        if (candidatePanel.dataset.truncated) {
          if (candidatePanelScrollTimer) {
            clearTimeout(candidatePanelScrollTimer);
            candidatePanelScrollTimer = null;
          }
          candidatePanel.addEventListener('scroll', candidatePanelOnScroll);
        }

        IMERender.toggleCandidatePanel(true, true);
      };

      if (candidatePanel.dataset.rowCount == 1) {
        var firstPageRows = 11;
        var numberOfCandidatesPerRow = IMERender.getNumberOfCandidatesPerRow();
        var candidateIndicator =
          parseInt(candidatePanel.dataset.candidateIndicator);

        if (inputMethodManager.currentIMEngine.getMoreCandidates) {
          inputMethodManager.currentIMEngine.getMoreCandidates(
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
      if (inputMethodManager.currentIMEngine.getMoreCandidates) {
        candidatePanel.removeEventListener('scroll', candidatePanelOnScroll);
        if (candidatePanelScrollTimer) {
          clearTimeout(candidatePanelScrollTimer);
          candidatePanelScrollTimer = null;
        }
      }

      IMERender.toggleCandidatePanel(false, true);
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
    if (target.dataset.compositeKey) {
      // Keys with this attribute set send more than a single character
      // Like ".com" or "2nd" or (in Catalan) "l·l".
      var compositeKey = target.dataset.compositeKey;
      for (var i = 0; i < compositeKey.length; i++) {
        inputMethodManager.currentIMEngine.click(compositeKey.charCodeAt(i));
      }
    }
    else {
      inputMethodManager.currentIMEngine.click(
        parseInt(target.dataset.keycode, 10),
        parseInt(target.dataset.keycodeUpper, 10));
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
      var candidatePanel = IMERender.candidatePanel;
      var candidateIndicator =
        parseInt(candidatePanel.dataset.candidateIndicator);

      if (inputMethodManager.currentIMEngine.getMoreCandidates) {
        inputMethodManager.currentIMEngine.getMoreCandidates(
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
  var candidatePanel = IMERender.candidatePanel;

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
  clearTouchedKeys();
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
function sendKey(keyCode, isRepeat) {
  switch (keyCode) {
  case KeyEvent.DOM_VK_BACK_SPACE:
    if (inputContext) {
      return inputContext.sendKey(keyCode, 0, 0, isRepeat);
    }
    break;
  case KeyEvent.DOM_VK_RETURN:
    if (inputContext) {
      return inputContext.sendKey(keyCode, 0, 0);
    }
    break;

  default:
    if (inputContext) {
      return inputContext.sendKey(0, keyCode, 0);
    }
    break;
  }
}

function replaceSurroundingText(text, offset, length) {
  if (inputContext) {
    return inputContext.replaceSurroundingText(text, offset, length);
  } else {
    console.warn('no inputContext for replaceSurroudingText');
    return new Promise(function(res, rej) { rej(); });
  }
}

// Set up the keyboard and its input method.
// This is called when we get an event from mozInputMethod.
// The state argument is the data passed with that event, and includes
// the input field type, its inputmode, its content, and the cursor position.
function showKeyboard() {
  perfTimer.printTime('showKeyboard');
  clearTimeout(hideKeyboardTimeout);

  inputContext = navigator.mozInputMethod.inputcontext;

  resetKeyboard();

  if (inputContext) {
    currentInputMode = inputContext.inputMode;
    currentInputType = mapInputType(inputContext.inputType);
  } else {
    currentInputMode = '';
    currentInputType = mapInputType('text');

    return;
  }

  // everything.me uses this setting to improve searches,
  // but they really shouldn't.
  settingsPromiseManager.set({
    'keyboard.current': keyboardName
  });

  // If we are already visible,
  // render the keyboard only after IMEngine is loaded.
  if (isKeyboardRendered) {
    switchIMEngine(keyboardName, true);

    return;
  }

  // render the keyboard right away w/o waiting for IMEngine
  // (it will be rendered again after imEngine is loaded)
  renderKeyboard(keyboardName);
  switchIMEngine(keyboardName, false);
}

// Hide keyboard
function hideKeyboard() {
  if (!isKeyboardRendered)
    return;

  deactivateInputMethod();

  clearTimeout(hideKeyboardTimeout);

  // For quick blur/focus events we don't want to hide the IME div
  // to avoid flickering and such

  hideKeyboardTimeout = setTimeout(function() {
    isKeyboardRendered = false;
  }, HIDE_KEYBOARD_TIMEOUT);

  // everything.me uses this setting to improve searches,
  // but they really shouldn't.
  settingsPromiseManager.set({
    'keyboard.current': undefined
  });

  clearTouchedKeys();
}

// Resize event handler
function onResize() {
  perfTimer.printTime('onResize');
  if (document.mozHidden) {
    return;
  }

  IMERender.resizeUI(currentLayout);
  updateTargetWindowHeight(); // this case is not captured by the mutation
  // observer so we handle it apart

  // TODO: need to check how to handle orientation change case to
  // show corrent word suggestions
  updateLayoutParams();
}

function switchIMEngine(layoutName, mustRender) {
  perfTimer.printTime('switchIMEngine');

  var layout = layoutLoader.getLayout(layoutName);
  var imEngineName = layout.imEngine || 'default';

  // dataPromise resolves to an array of data to be sent to imEngine.activate()
  var dataPromise = Promise.all(
    [inputContextGetTextPromise, imEngineSettings.initSettings()])
  .then(function(values) {
    perfTimer.printTime('switchIMEngine:dataPromise resolved');

    // Resolve to this array
    return [
      layout.autoCorrectLanguage,
      {
        type: inputContext.inputType,
        inputmode: inputContext.inputMode,
        selectionStart: inputContext.selectionStart,
        selectionEnd: inputContext.selectionEnd,
        value: values[0]
      },
      {
        suggest: values[1].suggestionsEnabled && !isGreekSMS(),
        correct: values[1].correctionsEnabled && !isGreekSMS()
      }
    ];
  }, function(error) {
    return Promise.reject(error);
  });

  var p = inputMethodManager.switchCurrentIMEngine(imEngineName, dataPromise);
  p.then(function() {
    perfTimer.printTime('switchIMEngine:promise resolved');
    // Render keyboard again to get updated info from imEngine
    if (mustRender || imEngineName !== 'default') {
      renderKeyboard(layoutName);
    }

    // Load l10n library after IMEngine is loaded (if it's not loaded yet).
    l10nLoader.load();
  }, function() {
    console.warn('Failed to switch imEngine for ' + layoutName + '.' +
      ' It might possible because we were called more than once.');
  });
}

// If the input method cares about layout details, get those details
// from the renderer and pass them on to the input method. This is called
// from renderKeyboard() each time the keyboard layout changes.
// As an optimzation, however, we only send parameters if layoutPage is
// the default, since the input methods we support don't do anything special
// for symbols
function updateLayoutParams() {
  if (inputMethodManager.currentIMEngine.setLayoutParams &&
      layoutPage === LAYOUT_PAGE_DEFAULT) {
    inputMethodManager.currentIMEngine.setLayoutParams({
      keyboardWidth: IMERender.getWidth(),
      keyboardHeight: getKeyCoordinateY(IMERender.getHeight()),
      keyArray: IMERender.getKeyArray(),
      keyWidth: IMERender.getKeyWidth(),
      keyHeight: IMERender.getKeyHeight()
    });
  }
}

function triggerFeedback(isSpecialKey) {
  if (vibrationFeedbackSettings.initialized) {
    var vibrationFeedbackSettingsValues =
      vibrationFeedbackSettings.getSettingsSync();
    if (vibrationFeedbackSettingsValues.vibrationEnabled) {
      try {
        navigator.vibrate(50);
      } catch (e) {}
    }
  } else {
    console.warn(
      'Vibration feedback needed but settings is not available yet.');
  }

  if (soundFeedbackSettings.initialized) {
    var soundFeedbackSettingsValues = soundFeedbackSettings.getSettingsSync();
    if (soundFeedbackSettingsValues.clickEnabled &&
        !!soundFeedbackSettingsValues.isSoundEnabled) {
      (isSpecialKey ? specialClicker : clicker).cloneNode(false).play();
    }
  } else {
    console.warn(
      'Sound feedback needed but settings is not available yet.');
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

// To determine if the candidate panel for word suggestion is needed
function needsCandidatePanel() {
  // Disable the word suggestion for Greek SMS layout.
  // This is because the suggestion result is still unicode and
  // we would not convert the suggestion result to GSM 7-bit.
  if (isGreekSMS()) {
    return false;
  }

  return !!((layoutLoader.getLayout(keyboardName).autoCorrectLanguage ||
           layoutLoader.getLayout(keyboardName).needsCandidatePanel) &&
          (!inputMethodManager.currentIMEngine.displaysCandidates ||
           inputMethodManager.currentIMEngine.displaysCandidates()));
}

// To determine if we need to show a "all uppercase layout" for Greek SMS
function isGreekSMS() {
  return (currentInputMode === '-moz-sms' &&
          keyboardName === 'el');
}

// Remove the event listeners on the touched keys and the highlighting.
// This is because sometimes DOM element is removed before
// touchend is fired.
function clearTouchedKeys() {
  for (var id in touchedKeys) {
    if (!touchedKeys[id]) {
      continue;
    }

    var target = touchedKeys[id].target;
    if (target) {
      target.removeEventListener('touchmove', onTouchMove);
      target.removeEventListener('touchend', onTouchEnd);
      target.removeEventListener('touchcancel', onTouchEnd);
      IMERender.unHighlightKey(target);
    }
  }

  hideAlternatives();
  touchedKeys = {};

  // Reset all the pending actions here.
  clearTimeout(deleteTimeout);
  clearInterval(deleteInterval);
  clearTimeout(menuTimeout);
}

// Hide the keyboard via input method API
function dismissKeyboard() {
  clearTimeout(deleteTimeout);
  clearInterval(deleteInterval);
  clearTimeout(menuTimeout);

  navigator.mozInputMethod.mgmt.hide();
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
