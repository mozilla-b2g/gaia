define(function(require) {
  'use strict';

  // AMD modules
  var KeyboardHelper = require('shared/keyboard_helper');

  var Languages = function() {};

  Languages.prototype = {
    init: function() {
      this.langSel.innerHTML = '';
      Settings.getSupportedLanguages(function fillLanguageList(languages) {
        for (var lang in languages) {
          var option = document.createElement('option');
          option.value = lang;
          // Right-to-Left (RTL) languages:
          // (http://www.w3.org/International/questions/qa-scripts)
          // Arabic, Hebrew, Farsi, Pashto, Urdu
          var rtlList = ['ar', 'he', 'fa', 'ps', 'ur'];
          // Use script direction control-characters to wrap the text labels
          // since markup (i.e. <bdo>) does not work inside <option> tags
          // http://www.w3.org/International/tutorials/bidi-xhtml/#nomarkup
          var lEmbedBegin =
              (rtlList.indexOf(lang) >= 0) ? '&#x202B;' : '&#x202A;';
          var lEmbedEnd = '&#x202C;';
          // The control-characters enforce the language-specific script
          // direction to correctly display the text label (Bug #851457)
          option.innerHTML = lEmbedBegin + languages[lang] + lEmbedEnd;
          option.selected = (lang == document.documentElement.lang);
          this.langSel.appendChild(option);
        }
      }.bind(this));
      setTimeout(this.update.bind(this));
    },
    update: function() {
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

      this.init();
    },
    onLocalized: function() {
      // update keyboard layout
      var lang = navigator.mozL10n.language.code;
      KeyboardHelper.changeDefaultLayouts(lang);

      // update UI
      this.update();
    }
  };

  return function ctor_languages() {
    return new Languages();
  };
});
