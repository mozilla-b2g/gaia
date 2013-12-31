(function() {
  'use strict';

  function SearchHandler() {
    var searchPort = null;

    this.onMessage = ensurePort;

    function handleMessage(msg) {
      var method = msg.data.method;
      var options = msg.data.options;

      switch (method) {
        case 'search':
          Evme.Client.search(options).then(
            function resolve(searchResults) {
            searchPort.postMessage({ 'results': searchResults });
          });
          break;

        case 'suggest':
          Evme.Client.suggestions(options).then(
            function resolve(searchSuggestions) {
            searchPort.postMessage({ 'suggestions': searchSuggestions });
          });
          break;

        default:
          break;
      }
    };

    /**
     * Opens the search port.
     * We need to do this only after we receive a message
     * Or else we will trigger launching of the search-results app.
     */
    function ensurePort(msg) {
      navigator.mozApps.getSelf().onsuccess = function() {
        var app = this.result;
        app.connect('eme-client').then(
          function onConnectionAccepted(ports) {
            ports.forEach(function(port) {
              searchPort = port;
            });
            SearchHandler.onMessage = handleMessage;
            handleMessage(msg);
          },
          function onConnectionRejected(reason) {
            dump('Error connecting: ' + reason + '\n');
          }
        );
      };
    }
  }

  Evme.SearchHandler = new SearchHandler();

})();
