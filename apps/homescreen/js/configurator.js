
'use strict';

var Configurator = (function() {
  var conf = {};

  var dummyProvider = {
    init: function() {
      // Do nothing
    },

    destroy: function() {
      // Do nothing
    }
  };

  function load(file) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', file, true);
    xhr.send(null);

    xhr.onload = function _xhrOnLoad(evt) {
      try {
        conf = JSON.parse(xhr.responseText);

        var searchPage = conf.search_page;
        if (searchPage) {
          var provider = window[searchPage.provider] || dummyProvider;
          if (searchPage.enabled) {
            provider.init();
            Homescreen.init(searchPage.separate_page? 1 : 0);
          } else {
            startHomescreenByDefault();
            setTimeout(provider.destroy, 0);
          }
        }
      } catch (e) {
        conf = {};
        console.error('Failed parsing homescreen configuration file: ' + e);
        startHomescreenByDefault();
      }
    };

    xhr.onerror = function _xhrOnError(evt) {
      console.error('File not found: js/init.json');
      startHomescreenByDefault();
    };
  }

  function startHomescreenByDefault() {
    var searchPage = document.querySelector('div[role="search-page"]');

    if (searchPage) {
      searchPage.parentNode.removeChild(searchPage);
    }

    if (Homescreen) {
      Homescreen.init(0);
    }
  }

  // Auto-initializing
  load('js/init.json');

  return {
    getSection: function(section) {
      return conf[section];
    },

    load: load
  };
}());
