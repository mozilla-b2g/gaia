(function() {
  'use strict';

  function SearchHandler() {
    var searchPort = null;

    this.handleMessage = handleMessage;

    function handleMessage(msg) {
      var query = msg.data.input;
      var method = msg.data.method;
      switch (method) {
        case 'search':
          Evme.SearchClient.search({
            'query': query
          }).then(function resolve(searchResults) {
            ensurePort({ 'results': searchResults });
          });
          break;

        case 'suggest':
          Evme.SearchClient.suggestions({
            'query': query
          }).then(function resolve(searchSuggestions) {
            ensurePort({ 'suggestions': searchSuggestions });
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
      if (searchPort) {
        searchPort.postMessage(msg);
      } else {
        navigator.mozApps.getSelf().onsuccess = function() {
          var app = this.result;
          app.connect('eme-client').then(
            function onConnectionAccepted(ports) {
              ports.forEach(function(port) {
                searchPort = port;
              });
              searchPort.postMessage(msg);
            },
            function onConnectionRejected(reason) {
              dump('Error connecting: ' + reason + '\n');
            }
          );
        };
      }
    }
  }

  Evme.SearchHandler = new SearchHandler();

})();
