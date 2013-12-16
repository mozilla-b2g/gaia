(function() {
  'use strict';

  function SearchHandler() {
    var searchPort = null;
    var query;

    navigator.mozApps.getSelf().onsuccess = function() {
      var app = this.result;
      app.connect('eme-client').then(
        function onConnectionAccepted(ports) {
          ports.forEach(function(port) {
            searchPort = port;
          });
        },
        function onConnectionRejected(reason) {
          dump('Error connecting: ' + reason + '\n');
        }
      );
    };

    this.onMessage = function onMessage(msg) {
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
     * Sends a message to the search results app.
     * Opens the port if it is not yet open
     */
    function sendResultsApp(message) {
      searchPort.postMessage(message);
    }
  }

  Evme.SearchHandler = new SearchHandler();
})();
