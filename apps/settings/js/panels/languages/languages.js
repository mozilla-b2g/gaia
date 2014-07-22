define(function(require) {
  'use strict';

  // AMD modules
  var KeyboardHelper = require('shared/keyboard_helper');
  var LanguageList = require('shared/language_list');

  var Languages = function() {};

  Languages.prototype = {
    buildList: function() {
      LanguageList.get(function fillList(languages, currentLang) {
        var options = document.createDocumentFragment();
        for (var lang in languages) {
          var isCurrent = (lang === currentLang);
          var option = document.createElement('option');
          option.value = lang;
          option.innerHTML = LanguageList.wrapBidi(lang, languages[lang]);
          option.selected = isCurrent;
          options.appendChild(option);
        }
        this.langSel.innerHTML = '';
        this.langSel.appendChild(options);
      }.bind(this));
    },
    updateDateTime: function() {
      // update the date and time samples in the 'languages' panel
      if (this.panel.children.length) {
        var d = new Date();
        var f = new navigator.mozL10n.DateTimeFormat();
        var _ = navigator.mozL10n.get;
        this.panel.querySelector('#region-date').textContent =
          f.localeFormat(d, _('longDateFormat'));
        this.panel.querySelector('#region-time').textContent =
          f.localeFormat(d, _('shortTimeFormat'));
      }
    },
    onInit: function(panel) {
      this.panel = panel;
      this.langSel =
        this.panel.querySelector('select[name="language.current"]');
      this.langSel.addEventListener('blur', this.buildList.bind(this));
    },
    onLocalized: function() {
      // update keyboard layout
      var lang = navigator.mozL10n.language.code;
      KeyboardHelper.changeDefaultLayouts(lang);

      // update the format example UI
      this.updateDateTime();
    }
  };

  return function ctor_languages() {
    return new Languages();
  };
});
