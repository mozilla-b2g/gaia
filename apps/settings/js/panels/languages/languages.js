define(function(require) {
  'use strict';

  // AMD modules
  var SettingsCache = require('modules/settings_cache');
  var KeyboardHelper = require('shared/keyboard_helper');
  var LanguageList = require('shared/language_list');
  // import this to update time format while laungage changed
  require('modules/date_time');

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
        this.elements.langSel.innerHTML = '';
        this.elements.langSel.appendChild(options);
      }.bind(this));
    },
    updateDateTime: function() {
      // update the date and time samples in the 'languages' panel
      if (this.panel.children.length) {
        var d = new Date();
        var dateString = d.toLocaleString(navigator.languages, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        var timeString = d.toLocaleString(navigator.languages, {
          hour12: navigator.mozHour12,
          hour: 'numeric',
          minute: 'numeric'
        });
        this.panel.querySelector('#region-date').textContent = dateString;
        this.panel.querySelector('#region-time').textContent = timeString;
      }
    },
    showMoreLanguages: function() {
      this.elements.moreLanguages.blur();
      SettingsCache.getSettings(function(result) {
        var version = result['langpack.channel'];
        /* jshint nonew: false */
        new window.MozActivity({
          name: 'marketplace-category',
          data: {
            slug: 'langpacks',
            // Marketplace expects major.minor
            fxos_version: version.split('.').slice(0, 2).join('.')
          }
        });
      });
    },
    onInit: function(panel, elements) {
      this.panel = panel;
      this.elements = elements;

      // Installing additional languages is only available on phones for now;
      // see https://bugzil.la/1124098.  On other device types the link to the
      // Marketpace is hidden.  Don't set the handler if it's display: none.
      if (this.elements.moreLanguages.offsetParent) {
        this.elements.moreLanguages.addEventListener('click',
          this.showMoreLanguages.bind(this));
      }
      this.elements.langSel.addEventListener('blur',
        this.buildList.bind(this));
    },
    onLocalized: function() {
      // update keyboard layout
      var lang = document.documentElement.lang;
      KeyboardHelper.changeDefaultLayouts(lang);

      // update the format example UI
      this.updateDateTime();
    }
  };

  return function ctor_languages() {
    return new Languages();
  };
});
