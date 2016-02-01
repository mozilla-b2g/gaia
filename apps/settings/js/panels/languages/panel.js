'use strict';

define(function(require) {
  var SettingsPanel = require('modules/settings_panel');
  var Languages = require('panels/languages/languages');

  return function ctor_languages_panel() {
    var languages = Languages();
    var onLocalized = languages.onLocalized.bind(languages);
    var onAdditionalLanguagesChange = languages.buildList.bind(languages);

    return SettingsPanel({
      onBeforeShow: function() {
        languages.buildList();
        languages.updateDateTime();
        document.addEventListener('DOMRetranslated', onLocalized);
        navigator.mozSettings.addObserver(
          'accessibility.screenreader', onAdditionalLanguagesChange);
        document.addEventListener(
          'additionallanguageschange', onAdditionalLanguagesChange);
      },
      onBeforeHide: function() {
        document.removeEventListener('DOMRetranslated', onLocalized);
        navigator.mozSettings.removeObserver(
          'accessibility.screenreader', onAdditionalLanguagesChange);
        document.removeEventListener(
          'additionallanguageschange', onAdditionalLanguagesChange);
      },
      onInit: function(panel) {
        var elements = {
          moreLanguages: panel.querySelector('.menuItem-more-languages'),
          langSel: panel.querySelector('select[name="language.current"]')
        };
        languages.onInit(panel, elements);
      }
    });
  };
});
