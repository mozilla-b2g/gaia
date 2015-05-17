(function() {

  'use strict';
  /* globals Promise, Provider, Search, MetricsHelper */
  /* globals LazyLoader */
  /* globals SearchProvider */

  var suggestionsWrapper = document.getElementById('suggestions-wrapper');
  var suggestionsProvider = document.getElementById('suggestions-provider');
  var suggestionsSelect = document.getElementById('suggestions-select');

  function providerUpdated() {

    navigator.mozL10n.setAttributes(suggestionsProvider, 'search-header', {
      provider: SearchProvider('title').toUpperCase()
    });

    var providers = SearchProvider.providers();
    var selectFragment = document.createDocumentFragment();
    var optionNode = document.createElement('option');

    Object.keys(providers).forEach(provider => {
      var option = optionNode.cloneNode();
      option.value = provider;
      option.text = providers[provider].title;
      if (provider === SearchProvider.selected()) {
        option.selected = true;
      }
      selectFragment.appendChild(option);
    });

    suggestionsSelect.innerHTML = '';
    suggestionsSelect.appendChild(selectFragment);
  }

  function encodeTerms(str, search) {
    return str.replace('{searchTerms}', encodeURIComponent(search));
  }

  function Suggestions() {}

  Suggestions.prototype = {

    __proto__: Provider.prototype,

    name: 'Suggestions',

    currentSearch: null,

    init: function() {
      this.metrics = new MetricsHelper();
      this.metrics.init();

      Provider.prototype.init.apply(this, arguments);

      suggestionsSelect.addEventListener('change', function(e) {
        SearchProvider.setProvider(e.target.value);
      });

      SearchProvider.ready().then(() => {
        providerUpdated();
        SearchProvider.providerUpdated(() => {
          providerUpdated();
          this.redoSearch();
        });
      });
    },

    redoSearch: function() {
      if (!this.currentSearch) {
        return;
      }
      this.search(this.currentSearch).then(results => {
        this.render(results);
      });
    },

    click: function(e) {
      this.metrics.report('websearch', SearchProvider('title'));
      var suggestion = e.target.dataset.suggestion;
      var url = encodeTerms(SearchProvider('searchUrl'), suggestion);
      Search.navigate(url);
    },

    search: function(input, preventRemote) {

      this.currentSearch = preventRemote ? null : input;
      this.render([input]);

      if (!navigator.onLine || preventRemote) {
        return Promise.resolve([input]);
      }

      suggestionsWrapper.dataset.loading = true;

      return SearchProvider.ready().then(() => {
        return new Promise((resolve, reject) => {
          var url = encodeTerms(SearchProvider('suggestUrl'), input);
          LazyLoader.getJSON(url, true).then(result => {
            var results = result[1];
            // We add an item to search the entered term as well
            results.unshift(input);
            resolve(results);
          });
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

      suggestionsWrapper.dataset.loading = false;
      this.container.innerHTML = '';

      if (ul.childNodes.length) {
        this.container.appendChild(ul);
      }
    },

    clear: function() {
      Provider.prototype.clear.apply(this, arguments);
      this.currentSearch = null;
    }

  };

  Search.provider(new Suggestions());

}());
