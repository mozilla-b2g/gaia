'use strict';

define(function(require) {
  var SettingsPanel = require('modules/settings_panel');
  var Languages = require('panels/languages/languages');

  return function ctor_languages_panel() {
    var languages = Languages();
    var localizedEventListener;

    return SettingsPanel({
      onBeforeShow: function() {
        localizedEventListener = function() {
          languages.onLocalized(languages);
        };
        window.addEventListener('localized', localizedEventListener);
      },
      onBeforeHide: function() {
        window.removeEventListener('localized', localizedEventListener);
      },
      onInit: function(panel) {
        languages.onInit(panel);
      }
    });
  };
});
