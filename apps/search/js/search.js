'use strict';

var Search = {
  _app: null,
  _port: null,
  terms: document.getElementById('search-terms'),
  suggestions: document.getElementById('search-suggestions'),

  providers: {},

  init: function() {
    navigator.mozSetMessageHandler('connection', function(connectionRequest) {
      var keyword = connectionRequest.keyword;
      if (keyword != 'search')
        return;

      var port = connectionRequest.port;
      port.onmessage = this.onSearchInput.bind(this);
      port.start();
    }.bind(this));

    this.suggestions.addEventListener('click', this.resultClick.bind(this));

    // Store the app reference
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function() {
      self._app = this.result;
    };
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

    if (target.dataset.provider) {
      this.providers[target.dataset.provider].click(target);
      return;
    }

    // Else update with the clicked text content
    this.postMessage({'input': target.textContent});
  },

  onSearchInput: function(msg) {
    var input = msg.data.input;
    this.terms.innerHTML = input;

    this.suggestions.innerHTML = '';
    if (!input.length) {
      return;
    }

    for (var i in this.providers) {
      this.providers[i].search(input);
    }
  },

  /**
   * Messages the parent container to close
   */
  close: function() {
    this.postMessage({'action': 'close'});
  },

  /**
   * Posts a message to the parent container
   * Initializes the port.
   */
  postMessage: function(message) {
    this._app.connect('search-results').then(
      function onConnectionAccepted(ports) {
      // Close the existing port if we have one
        if (self._port) {
          self._port.close();
        }

        ports.forEach(function(port) {
          self._port = port;
          port.postMessage(message);
        });
      },
      function onConnectionRejected(reason) {
        dump('Error connecting: ' + reason + '\n');
      }
    );
  }
};

Search.init();
