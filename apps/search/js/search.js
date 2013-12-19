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
              port.onmessage = self.providers.EverythingMe.onmessage
                .bind(self.providers.EverythingMe);
              port.start();
            } else if (keyword === 'search') {
              port.onmessage = self.onSearchInput.bind(self);
              port.start();
            }
          });
        initializeProviders();
      }

      function initializeProviders() {
        var template = 'section#{name}';

        for (var i in self.providers) {
          var name = self.providers[i].name.toLowerCase();
          var selector = template.replace('{name}', name);

          self.providers[i].init({
            container: document.querySelector(selector)
          });
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
          window.open(getUrlFromInput(input), '_blank', 'remote=true');
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
    }
  };

  window.addEventListener('load', Search.init.bind(Search));

})();
