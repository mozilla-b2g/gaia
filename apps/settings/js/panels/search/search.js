'use strict';

define(function(require) {
  var SettingsCache = require('modules/settings_cache');

  function Search() {
    this._searchUrlTemplate = null;
    this._searchEngineSelect = null;
  }

  Search.prototype.init = function(searchEngineSelect) {
    this._searchEngineSelect = searchEngineSelect;
    this.getCurrentSearchEngine();
    this.initSearchEngineSelect();
  };

  Search.prototype.getCurrentSearchEngine = function() {
    SettingsCache.getSettings((function(settingsCache) {
      this._searchUrlTemplate = settingsCache['search.urlTemplate'];
    }).bind(this));
  };

  Search.prototype.initSearchEngineSelect = function() {
    // Get search provider list from settings
    SettingsCache.getSettings((function(settingsCache) {
      var searchEngineList = settingsCache['search.providers'];
      // If the list is empty, populate it from default JSON file
      if (!searchEngineList) {
        this.populateSearchEngines(this.generateSearchEngineOptions.bind(this));
        return;
      }

      // Otherwise just go ahead and generate the options
      this.generateSearchEngineOptions(searchEngineList);
    }).bind(this));
  };

  /**
   * Populate search engine list in settings from default JSON file.
   *
   * @param {Function} callback function to call with retrieved data.
   */
  Search.prototype.populateSearchEngines = function(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/resources/search/providers.json', true);

    xhr.onload = function() {
      if (!(xhr.status === 200 | xhr.status === 0)) {
        console.error('Unable to get default search provider file.');
        return;
      }

      var data = JSON.parse(xhr.responseText);
      if (!data) {
        return;
      }

      if (callback) {
        callback(data);
      }
      var result = navigator.mozSettings.createLock().set({
        'search.providers': data
      });
      result.onerror = function() {
        console.error('Unable to set search providers setting');
      };
    };

    xhr.send();
  };

  /**
   * Generate <options> for the search engine <select> element.
   *
   * @param {Array} data An array of engine objects.
   * @this
   */
  Search.prototype.generateSearchEngineOptions = function(data) {
    if (!data) {
      return;
    }

    if (!this._searchEngineSelect) {
      return;
    }

    this._searchEngineSelect.innerHTML = '';

    var selectFragment = document.createDocumentFragment();
    var optionNode = document.createElement('option');

    for (var i = 0; i < data.length; i++) {
      var engine = data[i];
      var option = optionNode.cloneNode();
      option.value = engine.urlTemplate;
      option.text = engine.title;
      if (engine.urlTemplate == this._searchUrlTemplate) {
        option.selected = true;
      }
      selectFragment.appendChild(option);
    }

    this._searchEngineSelect.appendChild(selectFragment);
  };

  return function() {
    return new Search();
  };
});
