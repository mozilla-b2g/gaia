(function() {
  'use strict';

  // timeout before notifying providers
  var SEARCH_DELAY = 600;
  var SEARCH_URI = 'http://www.google.com/search?q={searchTerms}';

  var timeoutSearchWhileTyping = null;

  var rscheme = /^(?:[a-z\u00a1-\uffff0-9-+]+)(?::|:\/\/)/i;

  function getUrlFromInput(input) {
    var hasScheme = !!(rscheme.exec(input) || [])[0];

    // Not a valid URL, could be a search term
    if (UrlHelper.isNotURL(input) && SEARCH_URI) {
      return SEARCH_URI.replace('{searchTerms}', input);
    }

    // No scheme, prepend basic protocol and return
    if (!hasScheme) {
      return 'http://' + input;
    }
    return input;
  };

  window.Search = {
    _port: null,

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
            dump('Error connecting: ' + reason + '\n');
          }
        );
      };

      function setConnectionHandler() {
        navigator.mozSetMessageHandler('connection',
          function(connectionRequest) {
            var keyword = connectionRequest.keyword;
            var port = connectionRequest.port;
            if (keyword === 'eme-client') {
              var SuggestionsProvider = self.providers.Suggestions;
              var WebResultsProvider = self.providers.WebResults;

              port.onmessage = function onmessage(msg) {
                SuggestionsProvider.onmessage.call(SuggestionsProvider, msg);
                WebResultsProvider.onmessage.call(WebResultsProvider, msg);
              };
              port.start();
            } else if (keyword === 'search') {
              port.onmessage = self.onSearchInput.bind(self);
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

    onSearchInput: function(msg) {
      clearTimeout(timeoutSearchWhileTyping);

      var input = msg.data.input;
      var type = msg.data.type;
      var providers = this.providers;

      timeoutSearchWhileTyping = setTimeout(function doSearch() {
        if (type === 'submit') {
          Search.browse(getUrlFromInput(input));
        } else {
          for (var i in providers) {
            providers[i].search(input, type);
          }
        }
      }, SEARCH_DELAY);
    },

    /**
     * Messages the parent container to close
     */
    close: function() {
      this._port.postMessage({'action': 'hide'});
    },

    /**
     * Opens a browser to a URL
     */
    browse: function(url) {
      window.open(url, '_blank', 'remote=true');
    },

    /**
     * Sends a message to the system app to update the input value
     */
    setInput: function(input) {
      this._port.postMessage({
        'input': input
      });
    }
  };

  window.addEventListener('load', Search.init.bind(Search));

})();
