(function() {

  'use strict';
  /* globals Promise, Provider, Search */
  /* globals SettingsListener */
  /* globals LazyLoader */

  var provider = null;
  var config = [];

  var suggestionTpl;
  var searchTpl;

  function providerUpdated(key) {
    if (!provider) {
      return;
    }

    config.forEach(item => {
      if (item.urlTemplate === provider) {
        searchTpl = item.urlTemplate;
        suggestionTpl = item.suggestionsUrlTemplate;
        var elem = document.getElementById('suggestion-provider');
        navigator.mozL10n.setAttributes(elem, 'search-header', {
          provider: item.title.toUpperCase()
        });
      }
    });
  }

  var SEARCH_PROVIDERS_KEY = 'search.providers';
  var SEARCH_TEMPLATE_KEY = 'search.urlTemplate';

  var req = navigator.mozSettings.createLock().get(SEARCH_PROVIDERS_KEY);
  req.onsuccess = function() {
    if (SEARCH_PROVIDERS_KEY in req.result) {
      config = req.result[SEARCH_PROVIDERS_KEY];
      providerUpdated();
    }
  };

  SettingsListener.observe(SEARCH_TEMPLATE_KEY, false, value => {
    if (value) {
      provider = value;
      providerUpdated();
    }
  });

  function encodeTerms(str, search) {
    return str.replace('{searchTerms}', encodeURIComponent(search));
  }

  function Suggestions() {}

  Suggestions.prototype = {

    __proto__: Provider.prototype,

    name: 'Suggestions',

    remote: true,

    init: function() {
      Provider.prototype.init.apply(this, arguments);
    },

    click: function(e) {
      var suggestion = e.target.dataset.suggestion;
      var url = encodeTerms(searchTpl, suggestion);
      Search.navigate(url);
    },

    search: function(input) {
      return new Promise((resolve, reject) => {
        var url = encodeTerms(suggestionTpl, input);
        LazyLoader.getJSON(url, true).then(result => {
          var results = result[1];
          // We add an item to search the entered term as well
          results.unshift(result[0]);
          resolve(results);
        });
      });
    },

    render: function(items) {
      var ul = document.createElement('ul');
      ul.setAttribute('role', 'listbox');

      items.forEach(function each(item) {
        var li = document.createElement('li');
        li.dataset.suggestion = li.textContent = item;
        li.setAttribute('role', 'option');
        ul.appendChild(li);
      });

      this.clear();

      if (ul.childNodes.length) {
        this.container.appendChild(ul);
      }
    }

  };

  Search.provider(new Suggestions());

}());
