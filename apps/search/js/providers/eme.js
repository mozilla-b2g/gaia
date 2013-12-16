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
      setTimeout(function nextTick() {
        this.port.postMessage({
          input: input,
          type: type
        });
      }.bind(this));
    },

    onmessage: function(msg) {
      if (!msg.data.results) {
        return;
      }

      this.results = document.createElement('section');
      msg.data.results.forEach(function eachresult(result) {
        var resultEl = document.createElement('div');
        resultEl.className = 'result';
        resultEl.dataset.provider = this.name;
        resultEl.dataset.url = result.url;
        resultEl.textContent = result.title;
        this.results.appendChild(resultEl);
      }, this);

      Search.suggestions.appendChild(this.results);
    }

  };

  Search.provider(new EverythingMe());

}());
