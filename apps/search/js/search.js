(function() {
  'use strict';

  // timeout before notifying providers
  var SEARCH_DELAY = 600;
  var timeoutSearchWhileTyping = null;

  window.Search = {
    _port: null,
    terms: document.getElementById('search-terms'),
    suggestions: document.getElementById('search-suggestions'),

    providers: {},

    init: function() {
      this.suggestions.addEventListener('click', this.resultClick.bind(this));

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

    resultClick: function(e) {
      var target = e.target;
      if (target === this.suggestions)
        return;

      var targetProvider = target.dataset.provider;
      if (targetProvider) {
        this.providers[targetProvider].click(target);
        return;
      }

      // Else update with the clicked text content
      this._port.postMessage({'input': target.textContent});
    },

    onSearchInput: function(msg) {
      var input = msg.data.input;
      var type = msg.data.type;
      this.terms.innerHTML = input;

      this.suggestions.innerHTML = '';

      var providers = this.providers;
      clearTimeout(timeoutSearchWhileTyping);
      timeoutSearchWhileTyping = setTimeout(function doSearch() {
        for (var i in providers) {
          providers[i].search(input, type);
        }
      }, self.SEARCH_DELAY);
    },

    /**
     * Messages the parent container to close
     */
    close: function() {
      this._port.postMessage({'action': 'close'});
    }
  };

  window.addEventListener('load', Search.init.bind(Search));

})();
