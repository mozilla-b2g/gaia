/**
 * The moudle supports displaying language information on an element.
 *
 * @module panels/root/language_item
 */
define(function(require) {
  'use strict';

  var LanguageList = require('shared/language_list');

  /**
   * @alias module:panels/root/language_item
   * @class LanguageItem
   * @param {HTMLElement} element
                          The element displaying the language information
   * @returns {LanguageItem}
   */
  function LanguageItem(element) {
    this._enabled = false;
    this._boundRefreshText = this._refreshText.bind(this, element);
  }

  LanguageItem.prototype = {
    /**
     * Refresh the text based on the language setting.
     *
     * @access private
     * @memberOf LanguageItem.prototype
     * @param {HTMLElement} element
                            The element displaying the language information
     */
    _refreshText: function l_refeshText(element) {
      // display the current locale in the main panel
      LanguageList.get().then(function displayLang([languages, currentLanguage]) {
        element.textContent = LanguageList.wrapBidi(
          currentLanguage, languages[currentLanguage]);
      });
    },

    /**
     * The value indicates whether the module is responding.
     *
     * @access public
     * @memberOf LanguageItem.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      if (this._enabled === value || !navigator.mozL10n) {
        return;
      }

      this._enabled = value;
      if (this._enabled) {
        window.addEventListener('localized', this._boundRefreshText);
        this._boundRefreshText();
      } else {
        window.removeEventListener('localized', this._boundRefreshText);
      }
    }
  };

  return function ctor_languageItem(element) {
    return new LanguageItem(element);
  };
});
