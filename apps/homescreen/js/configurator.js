
'use strict';

const Configurator = (function() {
  var conf = {};

  var dummyProvider = {
    init: function() {
      // Do nothing
    },

    destroy: function() {
      // Do nothing
    }
  }

  var xhr = new XMLHttpRequest();
  xhr.overrideMimeType('application/json');
  xhr.open('GET', 'js/init.json', true);
  xhr.send(null);

  xhr.onload = function _xhrOnLoad(evt) {
    try {
      conf = JSON.parse(xhr.responseText);

      var searchPage = conf.search_page;
      if (searchPage) {
        var provider = window[searchPage.provider] || dummyProvider;
        if (searchPage.enabled) {
          provider.init();
          Homescreen.init(1);
        } else {
          startHomescreenByDefault();
          setTimeout(provider.destroy, 0);
        }
      }
    } catch (e) {
      console.error('Failed parsing homescreen configuration file: ' + e);
      startHomescreenByDefault();
    }
  }

  xhr.onerror = function _xhrOnError(evt) {
    console.error('File not found: js/init.json');
    startHomescreenByDefault();
  }

  function startHomescreenByDefault() {
    var searchPage = document.querySelector('div[role="search-page"]');
    searchPage.parentNode.removeChild(searchPage);
    Homescreen.init(0);
  }

  return {
    getSection: function(section) {
      return conf[section];
    }
  }
}());
