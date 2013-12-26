(function() {
  'use strict';

  window.eme = {
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


  /******************************* API methods *******************************/
  eme.api = {
    'search': 'search',
    'suggest': 'suggest'
  };


  /********************************* Search *********************************/
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

  eme.search = {
    'features' : {
      'type': 'type',
      'more': 'more',
      'rtrn': 'rtrn'
    },
    'config': SearchConfig
  };


  /********************************* Suggest *********************************/
  function SuggestConfig(config) {
    var _config = {
      'query': '',
      'limit': 10
    };

    for (var key in config) {
      if (config.hasOwnProperty(key)) {
        _config[key] = config[key];
      }
    }

    return _config;
  }

  eme.suggest = {
    'config': SuggestConfig
  };

})();
