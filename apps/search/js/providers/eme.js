(function() {

  'use strict';

  function Eme() {
    this.name = 'Eme';
    this.port = null;
  }

  Eme.prototype = {

    __proto__: Provider.prototype,

    init: function() {
      // Broadcast to eme-input channel
      var self = this;
      Search.app.connect('eme-input').then(
        function onConnectionAccepted(ports) {
          ports.forEach(function(port) {
            self.port = port;
          });
        },
        function onConnectionRejected(reason) {
          console.log('Error connecting: ' + reason + '\n');
        }
      );

      // Listen to eme-api channel
      navigator.mozSetMessageHandler('connection', function(connectionRequest) {
        var keyword = connectionRequest.keyword;
        if (keyword != 'eme-api')
          return;

        var port = connectionRequest.port;
        port.onmessage = this.onmessage.bind(this);
        port.start();
      }.bind(this));
    },

    click: function(target) {
      Search.close();
      window.open(target.dataset.href);
    },

    search: function(input) {
      console.log('Searching: ', input);
      this.port.postMessage({ 'input': input });
    },

    onmessage: function(msg) {
      console.log('Search apps message: ', msg.data.results);
    }
  };

  Search.provider(new Eme());
}());
