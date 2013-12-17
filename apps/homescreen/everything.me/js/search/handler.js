(function() {
  'use strict';

  function SearchHandler() {
    var searchPort = null;
    var query;

    this.onMessage = ensurePort;

    function handleMessage(msg) {
      query = msg.data.input;
      if (query) {
        Evme.SearchClient.search({
          'query': query
        }, function success(data) {
          var response = data.response;
          if (response.query !== query) {
            // stale results, ignore them
            console.log('evme', 'stale results');
            return;
          }

          var apps = response.apps;
          if (apps.length) {
            sendResultsApp({
              results: apps.map(function result(app) {
                return {
                  'url': app.appUrl,
                  'title': app.name
                };
              })
            });
          }
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

    /**
     * Sends a message to the search results app.
     * Opens the port if it is not yet open
     */
    function sendResultsApp(message) {
      searchPort.postMessage(message);
    }
  }

  Evme.SearchHandler = new SearchHandler();
})();
