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
  'languagePanel': '#languages',
  'body': 'body',
  'header': 'gaia-header',
  'languageChangeSelect': '#languages select[name="language.current"]',
  'languageLabel': 'p[data-l10n-id="language"]',
  'languageRegionDateLabel': '#region-date'
};

LanguagePanel.prototype = {
  __proto__: Base.prototype,

  // The \u202a, \u202b and \u202c are special Unicode formatting codes which
  // force the direction of the text between them.  They are added by
  // LanguageList.wrapBidi to ensure proper display of all language names.
  _languageMap: {
    english: {
      label: 'Language',
      desc: '\u202aEnglish (US)\u202c',
      dayRules: /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/
    },
    accented: {
      label: 'Ŀȧȧƞɠŭŭȧȧɠḗḗ',
      desc: '\u202aƤȧȧƈķȧȧɠḗḗḓ Ȧȧƈƈḗḗƞŧḗḗḓ\u202c',
      dayRules: new RegExp(
        'Ḿǿǿƞḓȧȧẏ|' +
        'Ŧŭŭḗḗşḓȧȧẏ|' +
        'Ẇḗḗḓƞḗḗşḓȧȧẏ|' +
        'Ŧħŭŭřşḓȧȧẏ|' +
        'Ƒřīīḓȧȧẏ|' +
        'Şȧȧŧŭŭřḓȧȧẏ|' +
        'Şŭŭƞḓȧȧẏ')
    },
    mirrored: {
      label: '\u202e˥ɐuƃnɐƃǝ\u202c',
      desc: '\u202b\u202eԀɐɔʞɐƃǝp\u202c \u202eWıɹɹoɹǝp\u202c\u202c',
      dayRules: new RegExp(
        '\u202eWoupɐʎ\u202c|' +
        '\u202e⊥nǝspɐʎ\u202c|' +
        '\u202eＭǝpuǝspɐʎ\u202c|' +
        '\u202e⊥ɥnɹspɐʎ\u202c|' +
        '\u202eɟɹıpɐʎ\u202c|' +
        '\u202eSɐʇnɹpɐʎ\u202c|' +
        '\u202eSnupɐʎ\u202c')
    }
  },

  get regionDateLabel() {
    return this.findElement('languageRegionDateLabel').text();
  },

  get currentLanguageFromMozSettings() {
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
        this._languageMap[value].desc);

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
  },

  back: function() {
    var parentSection = this.waitForElement('languagePanel');
    var bodyWidth = this.findElement('body').size().width;

    this.findElement('header').tap(25, 25);

    this.client.waitFor(function() {
      var loc = parentSection.location();
      return Math.abs(loc.x) >= bodyWidth;
    });
  }

};
