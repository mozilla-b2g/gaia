(function() {
  'use strict';

  var API_METHODS = {
    SEARCH: 'search',
    SUGGEST: 'suggest'
  };

  var SEARCH_FEATURES = {
    'TYPE': 'type',
    'MORE': 'more',
    'RTRN': 'rtrn'
  };

  function SearchConfig(config) {
    var _config = {
      'exact': false,
      'feature': '',
      'first': 0,
      'iconFormat': 10,
      'limit': 10,
      'maxNativeSuggestions': 0,
      'nativeSuggestions': false,
      'prevQuery': '',
      'query': '',
      'spellcheck': false,
      'suggest': false
    };

    for (var key in config) {
      if (config.hasOwnProperty(key)) {
        _config[key] = config[key];
      }
    }

    return _config;
  }


  window.eme = {
    API: API_METHODS,
    SearchConfig: SearchConfig,
    SEARCH_FEATURES: SEARCH_FEATURES,

    port: null,

    openPort: function openPort() {
      if (this.port) {
        return;
      }

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
    }
  };

})();
