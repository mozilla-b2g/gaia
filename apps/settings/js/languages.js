var Languages = {
  init: function() {
    var langSel = document.querySelector('select[name="language.current"]');
    langSel.innerHTML = '';
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
        langSel.appendChild(option);
      }
    });
    setTimeout(this.update);

    window.addEventListener('localized',
      function updateDefaultLayouts(event) {
        var lang = navigator.mozL10n.language.code;
        KeyboardHelper.changeDefaultLayouts(lang);
      });
  },
  update: function() {
    var panel = document.getElementById('languages');
    // update the date and time samples in the 'languages' panel
    if (panel.children.length) {
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
      var _ = navigator.mozL10n.get;
      panel.querySelector('#region-date').textContent =
          f.localeFormat(d, _('longDateFormat'));
      panel.querySelector('#region-time').textContent =
          f.localeFormat(d, _('shortTimeFormat'));
    }
  }
};

navigator.mozL10n.ready(function startupLocale() {
  Languages.init();
  window.addEventListener('localized', Languages.update);
});
