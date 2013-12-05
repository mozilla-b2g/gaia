'use strict';

var Search = {
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

    // Initialize the parent port connection
    var self = this;
    navigator.mozApps.getSelf().onsuccess = function() {
      var app = this.result;
      app.connect('search-results').then(
        function onConnectionAccepted(ports) {
          ports.forEach(function(port) {
            self._port = port;
          });
        },
        function onConnectionRejected(reason) {
          dump('Error connecting: ' + reason + '\n');
        }
      );
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
    this._port.postMessage({'input': target.textContent});
  },

  onSearchInput: function(msg) {
    var input = msg.data.input;
    this.terms.innerHTML = input;

    this.suggestions.innerHTML = '';
    for (var i in this.providers) {
      this.providers[i].search(input);
    }
  },

  /**
   * Messages the parent container to close
   */
  close: function() {
    this._port.postMessage({'action': 'close'});
  }
};

Search.init();
