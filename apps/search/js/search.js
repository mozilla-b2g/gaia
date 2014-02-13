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
        for (var i in providers) {
          providers[i].search(input);
        }
      }, SEARCH_DELAY);
    },

    /**
     * Called when the user submits the search form
     */
    submit: function(msg) {
      Search.navigate(getUrlFromInput(msg.data.input));
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
     */
    navigate: function(url) {
      window.open(url, '_blank', 'remote=true,useAsyncPanZoom=true');
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
