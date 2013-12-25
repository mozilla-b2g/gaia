(function() {
  'use strict';

  function SearchHandler() {
    var searchPort = null;

    this.onMessage = ensurePort;

    function handleMessage(msg) {
      var query = msg.data.input;
      var method = msg.data.method;

      switch (method) {
        case 'search':
          Evme.SearchClient.search({
            'query': query
          }).then(function resolve(searchResults) {
            searchPort.postMessage({ 'results': searchResults });
          });
          break;

        case 'suggest':
          Evme.SearchClient.suggestions({
            'query': query
          }).then(function resolve(searchSuggestions) {
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
