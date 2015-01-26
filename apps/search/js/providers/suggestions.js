(function() {

  'use strict';
  /* globals Promise, Provider, Search */
  /* globals LazyLoader */
  /* globals SearchProvider */

  var suggestionsProvider = document.getElementById('suggestions-provider');
  var suggestionsSelect = document.getElementById('suggestions-select');

  SearchProvider.providerUpdated(function() {

    navigator.mozL10n.setAttributes(suggestionsProvider, 'search-header', {
      provider: SearchProvider('title').toUpperCase()
    });

    var selected = SearchProvider.selected();
    var providers = SearchProvider.providers();
    var selectHTML = Object.keys(providers).map(provider => {
      return '<option value="' + provider + '" ' +
        ((provider === selected) ? 'selected="selected"' : '') +
        '>' + providers[provider].title + '</option>';
    }).join('');

    suggestionsSelect.innerHTML = selectHTML;
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
      suggestionsSelect.addEventListener('change', function(e) {
        SearchProvider.setProvider(e.target.value);
      });
    },

    click: function(e) {
      var suggestion = e.target.dataset.suggestion;
      var url = encodeTerms(SearchProvider('searchUrl'), suggestion);
      Search.navigate(url);
    },

    search: function(input) {
      return new Promise((resolve, reject) => {
        var url = encodeTerms(SearchProvider('suggestUrl'), input);
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
