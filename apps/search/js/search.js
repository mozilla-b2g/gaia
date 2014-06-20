(function() {

  'use strict';
  /* global asyncStorage */
  /* global Contextmenu */
  /* global Search */
  /* global SearchDedupe */
  /* global SettingsListener */
  /* global UrlHelper */

  // timeout before notifying providers
  var SEARCH_DELAY = 600;

  window.Search = {

    _port: null,

    providers: {},

    /**
     * Template to construct search query URL. Set from search.urlTemplate
     * setting. {searchTerms} is replaced with user provided search terms.
     *
     * 'everything.me' is a special case which uses the e.me UI instead.
     */
    urlTemplate: 'https://www.google.com/search?q={searchTerms}',

    searchResults: document.getElementById('search-results'),
    newTabPage: document.getElementById('newtab-page'),

    suggestionsEnabled: false,

    /**
     * Used to display a notice on how to configure the search provider
     * on first use
     */
    suggestionNotice: document.getElementById('suggestions-notice-wrapper'),
    toShowNotice: true,
    changeCount: 0,

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

      // Listen for changes in default search engine
      SettingsListener.observe('search.urlTemplate', false, function(value) {
        if (value) {
          this.urlTemplate = value;
        }
      }.bind(this));

      var enabledKey = 'search.suggestions.enabled';
      SettingsListener.observe(enabledKey, true, function(enabled) {
        this.suggestionsEnabled = enabled;
      }.bind(this));

      this.initNotice();

      // Fire off a dummy geolocation request so the prompt can be responded
      // to before the user starts typing
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(function(){});
      }

      this.contextmenu = new Contextmenu();
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

      this.maybeShowNotice();
      this.clear();

      this.changeTimeout = setTimeout(function doSearch() {
        this.dedupe.reset();

        for (var i in providers) {
          var provider = providers[i];
          // If suggestions are disabled, only use local providers
          if (this.suggestionsEnabled || !provider.remote) {
            provider.search(input, this.collect.bind(this, provider));
          }
        }
      }.bind(this), SEARCH_DELAY);
    },

    /**
     * Show a notice to the user informaing them of how to configure
     * search providers, should only be shown once.
     */
    initNotice: function() {

      var noticeKey = 'notice-shown';
      var confirm = document.getElementById('suggestions-notice-confirm');

      confirm.addEventListener('click', function() {
        this.suggestionNotice.hidden = true;
        this.toShowNotice = false;
        asyncStorage.setItem(noticeKey, true);
      }.bind(this));

      asyncStorage.getItem(noticeKey, function(value) {
        this.toShowNotice = !value;
      }.bind(this));
    },

    maybeShowNotice: function() {
      if (this.toShowNotice && ++this.changeCount > 2) {
        this.suggestionNotice.hidden = false;
      }
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
        // Special case for everything.me
        if (this.urlTemplate == 'everything.me') {
          this.expandSearch(input);
        // Other search providers show results in the browser
        } else {
          var url = this.urlTemplate.replace('{searchTerms}',
                                             encodeURIComponent(input));
          this.navigate(url);
        }
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
