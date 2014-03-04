/* global eme, Provider, Search */

(function() {

  'use strict';

  function WebResults(eme) {}

  WebResults.prototype = {

    __proto__: Provider.prototype,

    name: 'WebResults',

    dedupes: true,
    dedupeStrategy: 'fuzzy',

    init: function() {
      Provider.prototype.init.apply(this, arguments);
      eme.init();
    },

    click: function(e) {
      var url = e.target && e.target.dataset.url;
      if (url) {
        Search.navigate(url, {
          icon: e.target.dataset.icon,
          originUrl: url,
          originName: e.target.dataset.title
        });
      }
    },

    search: function(input, collect) {
      this.clear();
      if (!eme.api.Apps) {
        return;
      }

      this.request = eme.api.Apps.search({
        'query': input
      });

      this.request.then((function resolve(data) {
        var response = data.response;
        if (response && response.apps && response.apps.length) {
          var results = response.apps.map(function each(app) {
            return {
              title: app.name,
              icon: app.icon,
              dedupeId: app.appUrl,
              dataset: {
                title: app.name,
                url: app.appUrl,
                icon: app.icon
              }
            };
          });
          collect(results);
        }
      }).bind(this), function reject(reason) {
        // handle errors
      });
    }

  };

  Search.provider(new WebResults(window.eme));

}());
