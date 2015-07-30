(function() {

  'use strict';
  /* global asyncStorage */
  /* global Contextmenu */
  /* global Search */
  /* global SearchDedupe */
  /* global SettingsListener */
  /* global UrlHelper */
  /* global SearchProvider */
  /* global MetricsHelper */
  /* global MozActivity */

  // timeout before notifying providers
  var SEARCH_DELAY = 500;
  var MAX_GRID_SIZE = 4;

  window.Search = {

    _port: null,

    providers: {},

    gridCount: 0,

    searchResults: document.getElementById('search-results'),

    offlineMessage: document.getElementById('offline-message'),
    suggestionsWrapper: document.getElementById('suggestions-wrapper'),
    grid: document.getElementById('icons'),
    gridWrapper: document.getElementById('icons-wrapper'),

    suggestionsEnabled: false,

    /**
     * Used to display a notice on how to configure the search provider
     * on first use
     */
    suggestionNotice: document.getElementById('suggestions-notice-wrapper'),
    get settingsLink() {
      return document.getElementById('settings-link');
    },

    toShowNotice: null,
    NOTICE_KEY: 'notice-shown',

    init: function() {

      this.dedupe = new SearchDedupe();

      this.metrics = new MetricsHelper();
      this.metrics.init();

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

      var enabledKey = 'search.suggestions.enabled';
      SettingsListener.observe(enabledKey, true, function(enabled) {
        this.suggestionsEnabled = enabled;
      }.bind(this));

      this.initNotice();
      this.initConnectivityCheck();

      this.contextmenu = new Contextmenu();
      window.addEventListener('resize', this.resize);
      window.addEventListener('scroll', this.onScroll);
    },

    resize: function() {
      if (this.grid && this.grid.render) {
        this.grid.render({
          rerender: true,
          skipDivider: true
        });
      }
    },

    // Typically an input keeps focus when the user scrolls, here we
    // want to grab focus and manually dismiss the keyboard.
    onScroll: function() {
      window.focus();
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

      this.changeTimeout = setTimeout(() => {
        this.clear();
        this.dedupe.reset();

        Object.keys(providers).forEach((providerKey) => {
          var provider = providers[providerKey];

          var preventRemoteFetch =
            UrlHelper.isURL(input) ||
            msg.data.isPrivateBrowser ||
            !this.suggestionsEnabled;

          if (provider.remote && preventRemoteFetch) {
            return;
          }

          if (provider.name === 'Suggestions') {
            var toShow = input.length > 2 &&
              this.toShowNotice &&
              this.suggestionsEnabled &&
              this.suggestionNotice.hidden &&
              navigator.onLine;
            if (toShow) {
              this.suggestionNotice.hidden = false;
            }
          }

          provider.search(input, preventRemoteFetch).then((results) => {
            this.collect(provider, results);
          });
        });
      }, SEARCH_DELAY);
    },

    /**
     * Show a notice to the user informaing them of how to configure
     * search providers, should only be shown once.
     */
    initNotice: function() {

      var confirm = document.getElementById('suggestions-notice-confirm');
      confirm.addEventListener('click', this.discardNotice.bind(this, true));

      var settingsLink = this.settingsLink;
      if (settingsLink) {
        settingsLink
          .addEventListener('click', this.openSettings.bind(this));
      }

      asyncStorage.getItem(this.NOTICE_KEY, function(value) {
        if (this.toShowNotice === null) {
          this.toShowNotice = !value;
        }
      }.bind(this));
    },

    openSettings: function() {
      this.discardNotice();
      /* jshint nonew: false */
      new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'search'
        }
      });
    },

    discardNotice: function(focus) {
      this.suggestionNotice.hidden = true;
      this.toShowNotice = false;
      asyncStorage.setItem(this.NOTICE_KEY, true);
      if (focus) {
        this._port.postMessage({'action': 'focus'});
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

      if (provider.dedupes) {
        results = this.dedupe.reduce(results, provider.dedupeStrategy);
      }

      if (provider.isGridProvider &&
        (results.length + this.gridCount) > MAX_GRID_SIZE) {
        var spaces = MAX_GRID_SIZE - this.gridCount;
        if (spaces < 1) {
          this.abort();
          return;
        }
        results.splice(spaces, (results.length - spaces));
      }

      if (provider.isGridProvider) {
        this.gridCount += results.length;
      }

      this.gridWrapper.classList.toggle('hidden', !this.gridCount);
      provider.render(results);
    },

    /**
     * Called when the user submits the search form
     */
    submit: function(msg) {

      this.discardNotice();

      var input = msg.data.input;

      // Not a valid URL, could be a search term
      if (UrlHelper.isNotURL(input)) {
        this.metrics.report('websearch', SearchProvider('title'));

        var url = SearchProvider('searchUrl')
          .replace('{searchTerms}', encodeURIComponent(input));
        this.navigate(url);
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
     * Clear results from each provider.
     */
    clear: function(msg) {
      this.abort();
      for (var i in this.providers) {
        this.providers[i].clear();
      }
      this.gridCount = 0;
      this.suggestionNotice.hidden = true;
    },

    showSearchResults: function() {
      if (this.searchResults) {
        this.searchResults.classList.remove('hidden');
      }
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
     */
    navigate: function(url) {
      window.open(url, '_blank', 'remote=true');
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
    },

    initConnectivityCheck: function() {
      var self = this;
      function onConnectivityChange() {
        if (navigator.onLine) {
          self.searchResults.classList.remove('offline');
        } else {
          self.searchResults.classList.add('offline');
        }
      }

      this.offlineMessage.addEventListener(
        'click', function() {
          var activity = new window.MozActivity({
            name: 'configure',
            data: {
              target: 'device',
              section: 'root',
              filterBy: 'connectivity'
            }
          });
          activity.onsuccess = function() {
            /*
            XXX: Since this activity inmediately returns
            success, we cannot go back to the search bar.
            Keeping a reference of the activity once this
            is fixed.
            */
          };
        }
      );

      window.addEventListener('offline', onConnectivityChange);
      window.addEventListener('online', onConnectivityChange);
      onConnectivityChange();
    }
  };

  window.addEventListener('load', Search.init.bind(Search));

})();
