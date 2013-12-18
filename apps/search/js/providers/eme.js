(function() {

  'use strict';

  function EverythingMe() {
    this.name = 'EverythingMe';
  }

  EverythingMe.prototype = {
    init: function() {
      // Broadcast to eme-api channel
      var self = this;
      navigator.mozApps.getSelf().onsuccess = function() {
        var app = this.result;
        app.connect('eme-api').then(
          function onConnectionAccepted(ports) {
            ports.forEach(function(port) {
              self.port = port;
            });
          },
          function onConnectionRejected(reason) {
            dump('Error connecting: ' + reason + '\n');
          }
        );
      };
    },

    click: function(target) {
      Search.close();
      // This actually doesn't work yet
      // Will be implemented by E.me in the homescreen
      window.open(target.dataset.url);
    },

    search: function(input, type) {
      this.results = document.createElement('section');
      Search.suggestions.appendChild(this.results);

      setTimeout(function nextTick() {
        this.port.postMessage({
          input: input,
          type: type
        });
      }.bind(this));
    },

    onmessage: function(msg) {
      var data = msg.data;

      if (data.result) {
        this.renderResult(data.result, data.icon);
      }
    },

    renderResult: function(searchResult, icon) {
      var resultEl = document.createElement('div');
      resultEl.className = 'result';
      resultEl.dataset.provider = this.name;
      resultEl.dataset.url = searchResult.url;
      resultEl.textContent = searchResult.title;

      var img = document.createElement('img');
      img.src = icon;
      resultEl.appendChild(img);

      this.results.appendChild(resultEl);
    }

  };

  Search.provider(new EverythingMe());

}());
