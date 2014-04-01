(function() {
  'use strict';
  /* global Search, UrlHelper */

  // timeout before notifying providers
  const SEARCH_DELAY = 600;

  window.Search = {
    _port: null,

    /**
     * A mapping of search results to be de-duplicated via manifesURL.
     */
    exactResults: {},

    /**
     * A mapping of search results to be de-duplicated by other than
     * manifestURL. This is our strategy of de-duplicating results from
     * Everything.me and locally installed apps.
     */
    fuzzyResults: {},

    /**
     * A list of common words that we ignore when de-duping
     */
    dedupeNullList: [
      'mobile', 'touch'
    ],

    providers: {},

    init: function() {
      // Initialize the parent port connection
      var self = this;
      navigator.mozApps.getSelf().onsuccess = function() {
        var app = this.result;
        app.connect('search-results').then(
          function onConnectionAccepted(ports) {
            ports.forEach(function(port) {
              self._port = port;
            });

            setConnectionHandler();
          },
          function onConnectionRejected(reason) {
            console.log('Error connecting: ' + reason + '\n');
          }
        );
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
          self.providers[i].init();
        }
      }
    },

    /**
     * Adds a search provider
     */
    provider: function(provider) {
      this.providers[provider.name] = provider;
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

      var input = msg.data.input;
      var providers = this.providers;

      this.changeTimeout = setTimeout(function doSearch() {
        this.exactResults = {};
        this.fuzzyResults = {};

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
      var webProvider = this.providers.WebResults;
      webProvider.search(query, function onCollect(results) {
        webProvider.render(results);
      });
      this.providers.BGImage.fetchImage(query);
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

      var validResults = [];

      // Cache the matched dedupe IDs.
      // Providers should not attempt to deduplicate against themselves.
      // This should perform better and lead to less misses.
      var exactDedupeIdCache = [];
      var fuzzyDedupeIdCache = [];

      results.forEach(function eachResult(result) {
        var found = false;
        var dedupeId = result.dedupeId.toLowerCase();

        // Get the host of the dedupeId for the fuzzy result case
        var host;
        try {
          host = new URL(dedupeId).host;
        } catch (e) {
          host = dedupeId;
        }
        var fuzzyDedupeIds = [host, dedupeId];

         // Try to use some simple domain heuristics to find duplicates
        // E.g, we would want to de-dupe between:
        // m.site.org and touch.site.org, sub.m.site.org and m.site.org
        // We also try to avoid deduping on second level domains by
        // checking the length of the segment.
        // For each part of the host, we add it to the fuzzy lookup table
        // if it is more than three characters. This algorithm is far
        // from perfect, but it will likely catch 99% of our usecases.
        var hostParts = host.split('.');
        for (var i in hostParts) {
          var part = hostParts[i];
          if (part.length > 3 && this.dedupeNullList.indexOf(part) === -1) {
            fuzzyDedupeIds.push(part);
          }
        }

        // Check if we have already rendered the result
        if (provider.dedupeStrategy == 'exact') {
          if (this.exactResults[dedupeId]) {
            found = true;
          }
        } else {
          // Handle the fuzzy matching case
          // Try to match against either host or subdomain
          fuzzyDedupeIds.forEach(function eachFuzzy(eachId) {
            for (var i in this.fuzzyResults) {
              if (i.indexOf(eachId) !== -1) {
                found = true;
              }
            }
          }, this);
        }

        // At the end of each iteration, cache the dedupe keys.
        exactDedupeIdCache.push(dedupeId);
        fuzzyDedupeIdCache = fuzzyDedupeIdCache.concat(fuzzyDedupeIds);

        if (!found) {
          validResults.push(result);
        }
      }, this);

      exactDedupeIdCache.forEach(function eachFuzzy(eachId) {
        this.exactResults[eachId] = true;
      }, this);

      fuzzyDedupeIdCache.forEach(function eachFuzzy(eachId) {
        this.fuzzyResults[eachId] = true;
      }, this);

      provider.render(validResults);
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
      var features = {
        remote: true,
        useAsyncPanZoom: true
      };

      config = config || {};
      for (var i in config) {
        features[i] = config[i];
      }

      var featureStr = Object.keys(features)
        .map(function(key) {
          return encodeURIComponent(key) + '=' +
            encodeURIComponent(features[key]);
        }).join(',');
      window.open(url, '_blank', featureStr);
    },

    /**
     * Sends a message to the system app to update the input value
     */
    setInput: function(input) {
      this._port.postMessage({
        'input': input
      });
      this.expandSearch(input);
    }
  };

  window.addEventListener('load', Search.init.bind(Search));

})();
