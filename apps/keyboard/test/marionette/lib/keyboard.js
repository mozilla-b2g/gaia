'use strict';

var Base = require('./base');
var Marionette = require('marionette-client');


function Keyboard(client) {
  Base.call(this, client);

  this.actions = new Marionette.Actions(client);
  this.currentLayout = null;
}

module.exports = Keyboard;

Keyboard.Selectors = Object.freeze({
  currentPanel:
    '.keyboard-type-container[data-active]',
  imeSwitchingKey:
    '.keyboard-type-container[data-active] ' +
    '.keyboard-key[data-keycode="-3"]',
  backspaceKey:
    '.keyboard-type-container[data-active] ' +
    '.keyboard-key[data-keycode="8"]',
  returnKey:
    '.keyboard-type-container[data-active] ' +
    '.keyboard-key[data-l10n-id="returnKey2"]',
  spaceBarKey: '.keyboard-type-container[data-active]' +
    ' .keyboard-key[data-keycode="32"]',
  dismissSuggestionsKey:
    '.keyboard-type-container[data-active] ' +
    '.dismiss-suggestions-button',
  shiftKey:
    '.keyboard-type-container[data-active] ' +
    'button.keyboard-key[data-l10n-id="upperCaseKey2"]',
  autoCorrectWord:
    '.keyboard-type-container[data-active] ' +
    '.autocorrect',
});

Keyboard.Templates = Object.freeze({
  key:
    '.keyboard-type-container[data-active] ' +
    'button.keyboard-key[data-keycode="%s"], ' +
    '.keyboard-type-container[data-active] ' +
    'button.keyboard-key[data-keycode-upper="%s"]',
  upperCaseKey:
    '.keyboard-type-container[data-active] ' +
    'button.keyboard-key[data-keycode-upper="%s"]',
  pageSwitchingKey:
    '.keyboard-type-container[data-active] ' +
    'button.keyboard-key[data-target-page="%s"]',
  suggestionKey:
    '.keyboard-type-container[data-active] ' +
    '.suggestions-container span[data-data="%s"]',
});

Keyboard.LONGPRESS_CHARS = Object.freeze({
  '0': 'º',
  '?': '¿',
  '$': '€£¥',
  '!': '¡',
  'a': 'áàâäåãāæ',
  'c': 'çćč',
  'e': 'éèêëēę€ɛ',
  'i': 'įīîìíï',
  'l': '£ł',
  'n': 'ńñ',
  'o': 'ɵøœōôòóö',
  's': 'ßśš$',
  'u': 'ūûùúü',
  'y': '¥ÿ',
  'z': 'žźż',
  'A': 'ÁÀÂÄÅÃĀÆ',
  'C': 'ÇĆČ',
  'E': 'ÉÈÊËĒĘ€Ɛ',
  'I': 'ĮĪÎÌÍÏ',
  'L': '£Ł',
  'N': 'ŃÑ',
  'O': 'ƟØŒŌÔÒÓÖ',
  'S': 'ŚŠŞ',
  'U': 'ŪÛÙÚÜ',
  'Y': '¥Ÿ',
  'Z': 'ŽŹŻ'
});

Keyboard.TypeGroupMap = Object.freeze({
  'text': 'text',
  'textarea': 'text',
  'url': 'url',
  'email': 'email',
  'password': 'password',
  'search': 'text',
  'number': 'number',
  'tel': 'number'
});

Keyboard.prototype = {
  __proto__: Base.prototype,

  get currentPanel() {
    return this.client.findElement(Keyboard.Selectors.currentPanel);
  },

  get imeSwitchingKey() {
    return this.client.findElement(Keyboard.Selectors.imeSwitchingKey);
  },

  get backspaceKey() {
    return this.client.findElement(Keyboard.Selectors.backspaceKey);
  },

  get returnKey() {
    return this.client.findElement(Keyboard.Selectors.returnKey);
  },

  get spaceBarKey() {
    return this.client.findElement(Keyboard.Selectors.spaceBarKey);
  },

  get shiftKey() {
    return this.client.findElement(Keyboard.Selectors.shiftKey);
  },

  get dismissSuggestionsKey() {
    return this.client.findElement(Keyboard.Selectors.dismissSuggestionsKey);
  },

  get autoCorrectWord() {
    return this.client.findElement(Keyboard.Selectors.autoCorrectWord);
  },

  getKey: function(char) {
    var selector = Keyboard.Templates.key.replace(/%s/g, char.charCodeAt(0));
    return this.client.findElement(selector);
  },

  getPageSwitchingKey: function(index) {
    var selector = Keyboard.Templates.pageSwitchingKey.replace(/%s/g, index);
    return this.client.findElement(selector);
  },

  getSuggestionKey: function(word) {
    var selector = Keyboard.Templates.suggestionKey.replace(/%s/, word);
    return this.client.findElement(selector);
  },

  getLongPressCharMiddleKey: function(char) {
    var chars = Keyboard.LONGPRESS_CHARS;

    for (var middleChar in chars) {
      if (chars[middleChar].indexOf(char) !== -1) {
        return middleChar;
      }
    }

    return undefined;
  },

  getCurrentInputType: function() {
    return this.client.executeScript(
      'return window.wrappedJSObject.app.getBasicInputType();');
  },

  getCurrentInputMode: function() {
    return this.client.executeScript(
      'return window.wrappedJSObject.app.inputContext.inputMode;');
  },

  getCurrentPageIndex: function() {
    return this.client.executeScript(
      'return window.wrappedJSObject.app.layoutManager.currentPageIndex;');
  },

  getCurrentKeyboardLayout: function() {
    var keyboardFrame;

    this.client.switchToFrame();

    keyboardFrame = this.client.findElement(
      '#keyboards .inputWindow.active iframe');
    this.currentLayout = keyboardFrame.getAttribute('data-frame-name');
    this.switchTo();

    return this.currentLayout;
  },

  getSymbolPageIndex: function(key) {
    this.switchToPage(1);

    if (this.isKeyPresent(key)) {
      return 1;
    }
    return 2;
  },

  tapBackspaceKey: function(word) {
    this.backspaceKey.tap();
  },

  tapAutoCorrectWord: function() {
    this.client.waitFor(() => {
      return this.autoCorrectWord.displayed();
    });
    this.autoCorrectWord.tap();
  },

  tapSuggestionWord: function(word) {
    this.getSuggestionKey(word).tap();
  },

  isUpperCase: function() {
    return this.client.executeScript(
      'return ' +
      'window.wrappedJSObject.app.upperCaseStateManager.isUpperCase;');
  },

  isElementPresent: function(selector) {
    var pollClient = this.client.scope({ searchTimeout: 50 });

    try {
      pollClient.findElement(selector);
    } catch (e) {
      return false;
    }

    return true;
  },

  isKeyPresent: function(key) {
    var keyTemplate = Keyboard.Templates.key;

    return this.isElementPresent(keyTemplate.replace(/%s/g, key.charCodeAt(0)));
  },

  switchCase: function(isUpperCase) {
    if (isUpperCase === undefined || this.isUpperCase() === isUpperCase) {
      return;
    }

    this.shiftKey.tap();
    this.client.waitFor(() => {
      var expected = isUpperCase ? 'true' : 'false';

      return (this.shiftKey.getAttribute('aria-pressed') === expected);
    });
  },

  switchToPage: function(index) {
    var pageIndex = this.getCurrentPageIndex();

    if (index === undefined || pageIndex === index) {
      return;
    }

    this.getPageSwitchingKey(index).tap();
    this.client.waitFor(() => {
      return (this.getCurrentPageIndex() === index);
    });
    this.waitForPageReady();
  },

  switchToKeyLayout: function(key) {
    var page;
    var upperCase;
    var currentLayout = this.currentLayout || this.getCurrentKeyboardLayout();

    if (['number'].indexOf(currentLayout) !== -1) {
      return;
    }

    if (key >= '0' && key <= '9') {
      page = 1;
    } else if (key >= 'A' && key <='Z') {
      page = 0;
      upperCase = true;
    } else if (key >= 'a' && key <= 'z') {
      page = 0;
      upperCase = false;
    } else if (key === ' ' || key === '\u0008' || key === '\u000d') {

    } else {
      page = this.getSymbolPageIndex(key);
    }

    this.switchToPage(page);
    this.switchCase(upperCase);
  },

  type: function(string) {
    string.split('').forEach((char) => {
      var middleChar = this.getLongPressCharMiddleKey(char);
      var lookingForKey = middleChar || char;
      var keyElement;

      this.switchToKeyLayout(lookingForKey);

      if (!middleChar) {
        keyElement = this.getKey(char);

        this.actions.wait(0.1).tap(keyElement).perform();
      } else {
        keyElement = this.getKey(middleChar);

        this.actions
        .press(keyElement).wait(1.5).perform()
        .move(this.getKey(char)).wait(0.2).release().perform();
      }
    });
  },

  longPressSpaceBar: function(time) {
    this.actions.longPress(this.spaceBarKey, time).perform();
  },

  switchTo: function() {
    var systemInputMgmt = this.client.loader.getAppClass(
      'system', 'input_management');

    systemInputMgmt.waitForKeyboardFrameDisplayed();
    systemInputMgmt.switchToActiveKeyboardFrame();

    this.waitForPageReady();
  },

  waitForPageReady: function() {
    this.client.waitFor(() => {
      return this.currentPanel.displayed();
    });
  },

  waitForKeyboardReady: function() {
    this.client.switchToFrame();

    this.client.waitFor(() => {
      return this.client.findElement(
        '#keyboards .inputWindow .browser-container');
    });
  }
};
