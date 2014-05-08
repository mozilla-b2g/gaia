'use strict';
var Base = require('../base');

/**
 * Abstraction around settings root panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function RootPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, RootPanel.Selectors);

}

module.exports = RootPanel;

RootPanel.Selectors = {
  'batteryDesc': '#battery-desc',
  'languageDesc': '#language-desc'
};

RootPanel.prototype = {

  __proto__: Base.prototype,

  _languageMap: {
    english: {
      desc: 'English (US)',
    },
    traditionalChinese: {
      desc: '正體中文',
    },
    french: {
      desc: 'Français',
    }
  },

  get isBatteryDescValid() {
    return this.waitForElement('batteryDesc').text().search(/\d+%/) !== -1;
  },

  get currentLanguageDesc() {
    return this.findElement('languageDesc').text();
  },

  isLanguageDescTranslated: function(languageKey) {
    if (this._languageMap[languageKey]) {
      var desc = this._languageMap[languageKey].desc;
      if (this.currentLanguageDesc === desc) {
        return true;
      }
    }
    return false;
  }
};
