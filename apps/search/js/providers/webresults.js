/* global eme, Provider, Search */

(function() {

  'use strict';

  function WebResults(eme) {}

  WebResults.prototype = {

    __proto__: Provider.prototype,

    name: 'WebResults',

    dedupes: true,
    dedupeStrategy: 'fuzzy',

    renderFullscreen: false,

    init: function() {
      Provider.prototype.init.apply(this, arguments);
      eme.init();
    },

    click: function(e) {
      var url = e.target && e.target.dataset.url;
      if (url) {

        var features = {
          remote: true,
          useAsyncPanZoom: true,
          icon: e.target.dataset.icon,
          originUrl: url,
          originName: e.target.dataset.title
        };

        var featureStr = Object.keys(features)
          .map(function(key) {
            return encodeURIComponent(key) + '=' +
              encodeURIComponent(features[key]);
          }).join(',');

        window.open(url, '_blank', featureStr);
      }
    },

    /**
     * Provides fullscreen search results.
     * This happens when a suggestion is tapped or the enter key is pressed.
     */
    fullscreen: function(query) {
      this.renderFullscreen = true;
      this.search(query, function onCollect(results) {
        this.render(results);
        this.renderFullscreen = false;
      }.bind(this));
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
          var results = [];
          response.apps.forEach(function each(app) {
            results.push({
              title: app.name,
              icon: app.icon,
              dedupeId: app.appUrl,
              dataset: {
                title: app.name,
                url: app.appUrl,
                icon: app.icon
              }
            });
          }, this);
          collect(results);
        }
      }).bind(this), function reject(reason) {
        // handle errors
      });
    }
  };

  Search.provider(new WebResults(window.eme));

}());
