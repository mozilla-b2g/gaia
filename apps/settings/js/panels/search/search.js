'use strict';

define(function(require) {

  require('shared/format');
  var SearchProvider = require('shared/search_provider');

  function Search() {
    this._searchEngineSelect = null;
  }

  Search.prototype.init = function(searchEngineSelect) {
    this._searchEngineSelect = searchEngineSelect;
    SearchProvider.ready().then(() => {
      this.drawProviders();
      // Listen for updates as the providers may be updated
      // within the search app
      SearchProvider.providerUpdated(this.drawProviders.bind(this));
    });
  };

  /**
   * Generate <options> for the search engine <select> element.
   *
   * @this
   */
  Search.prototype.drawProviders = function() {

    if (!this._searchEngineSelect) {
      return;
    }

    this._searchEngineSelect.innerHTML = '';

    var selectFragment = document.createDocumentFragment();
    var optionNode = document.createElement('option');

    var providers = SearchProvider.providers();

    Object.keys(providers).forEach(function(provider) {
      var option = optionNode.cloneNode();
      option.value = provider;
      option.text = providers[provider].title;
      if (provider === SearchProvider.selected()) {
        option.selected = true;
      }
      selectFragment.appendChild(option);
    });

    this._searchEngineSelect.appendChild(selectFragment);
  };

  return function() {
    return new Search();
  };
});
