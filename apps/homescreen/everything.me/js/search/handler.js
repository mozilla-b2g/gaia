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

    this.onSearchResult = function onSearchResult(resultQuery, searchResult) {
      // only if results still relevant
      if (resultQuery === query) {
        sendResult(searchResult);
      }
    };

    function sendResult(searchResult) {
      renderIcon(searchResult, function iconReady(blob) {
        searchPort.postMessage({
          'result': searchResult,
          'icon': blob
        });
      });
    }

    // leaving this async for now
    // we should use blobs instead of base64
    // see bugs 951246,951249
    function renderIcon(searchResult, cb) {
      var iconData = searchResult.iconData;
      var src = 'data:' + iconData.MIMEType + ';base64,' + iconData.data;
      cb(src);
    }
  }

  Evme.SearchHandler = new SearchHandler();

})();
