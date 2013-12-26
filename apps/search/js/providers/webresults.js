(function() {

  'use strict';

  function WebResults(eme) {}

  WebResults.prototype = {

    __proto__: AppProvider.prototype,

    name: 'WebResults',

    init: function() {
      AppProvider.prototype.init.apply(this, arguments);
      eme.openPort();
    },

    click: function(e) {
      var url = e.target && e.target.dataset.url;
      if (url) {
        Search.browse(url);
      }
    },

    search: function(input, type) {
      this.clear();

      setTimeout(function nextTick() {
        var searchFeature = '',
            searchExact = false;

        switch (type) {
          case 'change':
            searchFeature = eme.search.features.type;
            searchExact = false;
            break;
          case 'submit':
            searchFeature = eme.search.features.rtrn;
            searchExact = true;
            break;
        }

        var config = new eme.search.config({
          'query': input,
          'feature': searchFeature,
          'exact': searchExact
        });

        eme.port.postMessage({
          method: eme.api.search,
          config: config
        });
      }.bind(this));
    },

    onmessage: function(msg) {
      var data = msg.data;
      if (!data) {
        return;
      }

      var results = data.results;
      if (results) {
        var formatted = [];
        results.forEach(function render(searchResult) {
          formatted.push({
            title: searchResult.title,
            icon: searchResult.icon,
            dataset: {
              url: searchResult.url
            }
          });
        }, this);
        this.render(formatted);
      }
    }

  };

  Search.provider(new WebResults(window.eme));

}());
