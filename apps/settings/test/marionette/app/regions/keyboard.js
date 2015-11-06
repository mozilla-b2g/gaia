'use strict';
var Base = require('../base');

/**
 * Abstraction around settings keyboard panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function KeyboardPanel(client) {
  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, KeyboardPanel.Selectors);
}

module.exports = KeyboardPanel;

KeyboardPanel.Selectors = {
  keyboardList: '.allKeyboardList li',
  header: '#keyboard gaia-header',
  panel: '#keyboard',
  selectKeyboards: '#keyboard a[href="#keyboard-selection-addMore"]',
  builtinKeyboardList: '#keyboard-selection-addMore .keyboardAppContainer ul',
  backButton: '#keyboard-selection-addMore gaia-header'
};

KeyboardPanel.prototype = {

  __proto__: Base.prototype,

  get header() {
    return this.findElement('header');
  },

  tapBuiltInKeyboardItem: function() {
    this.waitForElement('keyboardList').tap();
  },

  tapSelectKeyboards: function() {
    this.waitForElement('selectKeyboards').tap();
  },

  selectLayout: function(layoutLabel) {
    var builtinKeyboardList = this.waitForElement('builtinKeyboardList');
    var layout = builtinKeyboardList.scriptWith(function(list, layoutLabel) {
      var langs = list.querySelectorAll('bdi');
      return [].filter.call(langs, function(lang) {
        return (lang.innerHTML === layoutLabel);
      })[0];
    }, [layoutLabel]);
    layout.tap();
  },

  tapBackButton: function() {
    var header = this.waitForElement('backButton');
    header.tap(25, 25);
  },

  isDialog: function() {
    var dialogAttribute =
      this.findElement('panel').getAttribute('data-dialog');
    return dialogAttribute === 'true';
  }
};
