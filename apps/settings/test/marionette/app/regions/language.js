'use strict';
var Base = require('../base');

/**
 * Abstraction around settings do not track panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function LanguagePanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, LanguagePanel.Selectors);

}

module.exports = LanguagePanel;

LanguagePanel.Selectors = {
  'languageChangeSelect': '#languages select[name="language.current"]',
  'languageLabel': 'p[data-l10n-id="language"]',
  'languageRegionDateLabel': '#region-date'
};

LanguagePanel.prototype = {
  __proto__: Base.prototype,

  // XXX it's weird that when fetching values out of the select/option
  // we would get strange '\u202a' and '\u202c' characters. In this way,
  // we have to add these characters to check ! We can remove this after
  // this problem got fixed.
  _languageMap: {
    english: {
      label: 'Language',
      optionText: '\u202aEnglish (US)\u202c',
      dayRules: /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
    },
    traditionalChinese: {
      label: '語言',
      optionText: '\u202a正體中文\u202c',
      dayRules: /一|二|三|四|五|六|日/i
    },
    french: {
      label: 'Langue',
      optionText: '\u202aFrançais\u202c',
      dayRules: /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i
    }
  },

  get regionDateLabel() {
    return this.findElement('languageRegionDateLabel').text();
  },

  get currentLanguageFromMozSettings() {
    // ar, en-US, fr, zh-TW for example
    return this.client.settings.get('language.current');
  },

  get currentLanguageLabel() {
    return this.findElement('languageLabel').text();
  },

  get currentLanguage() {
    var languageLabel = this.currentLanguageLabel;
    var realLanguage;

    for (var languageKey in this._languageMap) {
      if (this._languageMap[languageKey].label === languageLabel) {
        realLanguage = languageKey;
        break;
      }
    }

    return realLanguage;
  },

  set currentLanguage(value) {
    if (this._languageMap[value]) {
      var oldLanguage = this.currentLanguage;
      this.tapSelectOption('languageChangeSelect',
        this._languageMap[value].optionText);

      this.client.waitFor(function() {
        var newLanguage = this.currentLanguage;
        return oldLanguage !== newLanguage;
      }.bind(this));
    }
  },

  setupDefaultLanguage: function() {
    if (this.currentLanguage !== 'english') {
      this.currentLanguage = 'english';
    }
  },

  isSampleFormatTranslated: function(languageKey) {
    if (this._languageMap[languageKey]) {
      var rule = this._languageMap[languageKey].dayRules;
      if (this.regionDateLabel.match(rule)) {
        return true;
      }
    }
    return false;
  }
};
