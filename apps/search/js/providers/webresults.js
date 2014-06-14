/* global eme, Search, DataGridProvider, Bookmark */

(function() {

  'use strict';

  function WebResults(eme) {}

  WebResults.prototype = {

    __proto__: DataGridProvider.prototype,

    name: 'WebResults',

    dedupes: true,
    dedupeStrategy: 'fuzzy',
    remote: true,

    renderFullscreen: false,

    init: function() {
      DataGridProvider.prototype.init.apply(this, arguments);
      eme.init();
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
              dedupeId: app.appUrl,
              data: new Bookmark({
                id: app.id,
                name: app.name,
                url: app.appUrl,
                icon: app.icon,
                clipIcon: true
              }, {
                search: true}
              )
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
