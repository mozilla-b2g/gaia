
'use strict';

var Search = {
  _port: null,
  terms: document.getElementById('search-terms'),
  suggestions: document.getElementById('search-suggestions'),

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

  resultClick: function(e) {
    var target = e.target;
    if (target === this.suggestions)
      return;

    if (target.dataset.activityItemId) {
      this._port.postMessage({'action': 'close'});
      var activity = new MozActivity({
        name: 'open',
        data: {
          type: 'webcontacts/contact',
          params: {
            'id': target.dataset.activityItemId
          }
        }
      });
      return;
    }

    // Else update with the clicked text content
    this._port.postMessage({'input': target.textContent});
  },

  onSearchInput: function(msg) {
    var input = msg.data.input;
    this.terms.innerHTML = input;

    // Do a dumb contacts search.
    var options = {
      filterValue: input,
      filterBy: ['givenName'],
      filterOp: 'startsWith'
    };

    this.suggestions.innerHTML = '';
    var request = navigator.mozContacts.find(options);

    request.onsuccess = (function() {
      var result = request.result;
      if (result.length > 0) {
        var fragment = document.createDocumentFragment();
        for (var i = 0; i < result.length; i++) {
          for (var j = 0; j < result[i].name.length; j++) {
            var div = document.createElement('div');
            div.dataset.activity = 'open';
            div.dataset.activityType = 'webcontacts/contact';
            div.dataset.activityItemId = result[i].id;
            div.textContent = result[i].name[j];
            fragment.appendChild(div);
          }
        }
        this.suggestions.appendChild(fragment.cloneNode(true));
      }
    }).bind(this);

    request.onerror = function() {
    };
  }
};

Search.init();
