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
      window.open(target.dataset.url);
    },

    search: function(input) {
      console.log('Rocketbar: Sending E.me input:', input);
      setTimeout(function nextTick() {
        this.port.postMessage({input: input});
      }.bind(this));
    },

    onmessage: function(msg) {
      console.log('Rocketbar: Got E.me message:', msg);
      this.results = document.createElement('section');
      Search.suggestions.appendChild(this.results);
      if (!msg.data.results) {
        return;
      }

      msg.data.results.forEach(function eachresult(result) {
        var resultEl = document.createElement('div');
        resultEl.className = 'result';
        resultEl.dataset.provider = this.name;
        resultEl.dataset.url = result.url;
        resultEl.textContent = result.title;
        this.results.appendChild(resultEl);
      }, this);
    }

  };

  Search.provider(new EverythingMe());

}());
