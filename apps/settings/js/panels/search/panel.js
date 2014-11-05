/**
 * SearchSettings provides the settings interface for search (i.e. default
 * search engine)
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Search = require('panels/search/search');

  var search;

  function onInit(panel) {
    var searchEngineSelect = panel.querySelector('[name="search.urlTemplate"]');
    search = Search();
    search.init(searchEngineSelect);
  }

  return function() {
    // SettingsPanel is not a constructor. Not even a little bit.
    return SettingsPanel({
      onInit: onInit
    });
  };
});
