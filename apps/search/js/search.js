(function() {

  'use strict';
  /* global Search */
  /* global SearchDedupe */
  /* global UrlHelper */

  // timeout before notifying providers
  var SEARCH_DELAY = 600;

  window.Search = {
    _port: null,

    providers: {},

    searchResults: document.getElementById('search-results'),
    newTabPage: document.getElementById('newtab-page'),

    init: function() {

      this.dedupe = new SearchDedupe();

      // Initialize the parent port connection
      var self = this;
      navigator.mozApps.getSelf().onsuccess = function() {
        var app = this.result;
        app.connect('search-results').then(function onConnAccepted(ports) {
          ports.forEach(function(port) {
            self._port = port;
          });
          setConnectionHandler();
        }, function onConnectionRejected(reason) {
          console.log('Error connecting: ' + reason + '\n');
        });
      };

      function setConnectionHandler() {
        navigator.mozSetMessageHandler('connection',
          function(connectionRequest) {
            var keyword = connectionRequest.keyword;
            var port = connectionRequest.port;
            if (keyword === 'search') {
              port.onmessage = self.dispatchMessage.bind(self);
              port.start();
            }
          });
        initializeProviders();
      }

      function initializeProviders() {
        for (var i in self.providers) {
          self.providers[i].init(self);
        }
      }
    },

    /**
     * Adds a search provider
     */
    provider: function(provider) {
      if (!(provider.name in this.providers)) {
        this.providers[provider.name] = provider;
      }
    },

    /**
     * Removes a search provider
     */
    removeProvider: function(provider) {
      delete this.providers[provider.name];
    },

    /**
     * Dispatches messages to handlers in the Search class
     */
    dispatchMessage: function(msg) {
      if (typeof this[msg.data.action] === 'function') {
        this[msg.data.action](msg);
      }
    },

    /**
     * Called when the user changes the search query
     */
    change: function(msg) {

      clearTimeout(this.changeTimeout);

      this.showSearchResults();

      var input = msg.data.input;
      var providers = this.providers;

      this.clear();

      this.changeTimeout = setTimeout(function doSearch() {
        this.dedupe.reset();

        for (var i in providers) {
          var provider = providers[i];
          provider.search(input, this.collect.bind(this, provider));
        }
      }.bind(this), SEARCH_DELAY);
    },

    /**
     * Expands the search experience when the user taps on a suggestion
     * or submits a query.
     */
    expandSearch: function(query) {
      this.clear();
      this.providers.WebResults.fullscreen(query);
    },

    /**
     * Collects results from a search provider.
     * If the provider de-duplicates results, filter through them
     * and dedupe them. Otherwise, render.
     * @param {Array} results The results of the provider search.
     */
    collect: function(provider, results) {
      if (!provider.dedupes) {
        provider.render(results);
        return;
      }

      results = this.dedupe.reduce(results, provider.dedupeStrategy);
      provider.render(results);
    },

    /**
     * Called when the user submits the search form
     */
    submit: function(msg) {
      var input = msg.data.input;

      // Not a valid URL, could be a search term
      if (UrlHelper.isNotURL(input)) {
        this.expandSearch(input);
        return;
      }

      var hasScheme = UrlHelper.hasScheme(input);

      // No scheme, prepend basic protocol and return
      if (!hasScheme) {
        input = 'http://' + input;
      }

      this.navigate(input);
    },

    /**
     * Called when the user submits the search form
     */
    clear: function(msg) {
      this.abort();
      for (var i in this.providers) {
        this.providers[i].clear();
      }
    },

    showBlank: function() {
      if (this.searchResults) {
        this.newTabPage.classList.add('hidden');
        this.searchResults.classList.add('hidden');
      }
    },

    /**
     * Called when the user displays the task manager
     */
    showTaskManager: function() {
      this.showBlank();
    },

    showSearchResults: function() {
      if (this.searchResults) {
        this.searchResults.classList.remove('hidden');
        this.newTabPage.classList.add('hidden');
      }
    },

    showNewTabPage: function() {
      this.searchResults.classList.add('hidden');
      this.newTabPage.classList.remove('hidden');
    },

    /**
     * Aborts all in-progress provider requests.
     */
    abort: function() {
      clearTimeout(this.changeTimeout);
      for (var i in this.providers) {
        this.providers[i].abort();
      }
    },

    /**
     * Messages the parent container to close
     */
    close: function() {
      this.abort();
      this._port.postMessage({'action': 'hide'});
    },

    /**
     * Opens a browser to a URL
     * @param {String} url The url to navigate to
     * @param {Object} config Optional configuration.
     */
    navigate: function(url, config) {
      var activity = new window.MozActivity({name: 'view', data: {
        type: 'url',
        url: url
      }});
      // Keep jshint happy
      activity.onsuccess = function() {};
    },

    requestScreenshot: function(url) {
      this._port.postMessage({
        'action': 'request-screenshot',
        'url': url
      });
    },

    /**
     * Sends a message to the system app to update the input value
     */
    setInput: function(input) {
      this._port.postMessage({
        'action': 'input',
        'input': input
      });
      this.expandSearch(input);
    }
  };

  window.addEventListener('load', Search.init.bind(Search));

})();
