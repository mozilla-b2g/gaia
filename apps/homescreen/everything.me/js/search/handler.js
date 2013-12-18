(function() {
  'use strict';

  function SearchHandler() {
    var searchPort = null;
    var query;

    this.onMessage = ensurePort;

    function handleMessage(msg) {
      var newQuery = msg.data.input;
      if (newQuery && newQuery !== query) {
        query = newQuery;
        Evme.SearchClient.search({
          'query': query
        });
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

    this.sendResults = function sendResults(resultQuery, searchResults) {
      // only if results still relevant
      if (resultQuery === query) {
        searchPort.postMessage({ 'results': searchResults });
      }
    };

  }

  Evme.SearchHandler = new SearchHandler();

})();
