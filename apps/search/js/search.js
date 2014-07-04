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
    NOTICE_KEY: 'notice-shown',

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

      this.clear();
      this.maybeShowNotice(input);

      var collectionCount = 0;
      var numProviders = Object.keys(this.providers).length;

      /**
       * Handles the display for the offline message. Displays the offline
       * message once we process results for all providers, and if there are no
       * results. Also called when the device comes online to hide the message.
       */
      function maybeShowOffline() {
        if (navigator.isOnline) {
          return;
        }

        var offlineMessage = document.getElementById('offline-message');
        offlineMessage.textContent = '';

        collectionCount++;
        if (collectionCount >= numProviders) {
          offlineMessage.textContent = navigator.mozL10n.get(
            'offline-webresults', {
            searchQuery: input
          });
        }
      }

      this.changeTimeout = setTimeout(() => {
        this.dedupe.reset();

        Object.keys(providers).forEach((providerKey) => {
          var provider = providers[providerKey];

          // If suggestions are disabled, only use local providers
          if (this.suggestionsEnabled || !provider.remote) {
            provider.search(input).then((results) => {
              if (!results.length) {
                maybeShowOffline();
              }

              this.collect(provider, results);
            }, () => {
              maybeShowOffline();
            });
          }
        });
      }, SEARCH_DELAY);
    },

    /**
     * Show a notice to the user informaing them of how to configure
     * search providers, should only be shown once.
     */
    initNotice: function() {

      var confirm = document.getElementById('suggestions-notice-confirm');

      confirm.addEventListener('click', this.discardNotice.bind(this));

      asyncStorage.getItem(this.NOTICE_KEY, function(value) {
        this.toShowNotice = !value;
      }.bind(this));
    },

    discardNotice: function() {
      this.suggestionNotice.hidden = true;
      this.toShowNotice = false;
      asyncStorage.setItem(this.NOTICE_KEY, true);
      this._port.postMessage({'action': 'focus'});
    },

    maybeShowNotice: function(msg) {
      this.suggestionNotice.hidden = !(msg.length > 2 && this.toShowNotice);
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

      if (!this.suggestionNotice.hidden) {
        this.discardNotice();
      }

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

      var offlineMessage = document.getElementById('offline-message');
      offlineMessage.textContent = '';

      this.suggestionNotice.hidden = true;
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
