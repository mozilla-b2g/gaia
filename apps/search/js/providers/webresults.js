/* global eme, Search, DataGridProvider, GaiaGrid, GridIconRenderer, Promise */

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
      this.search(query).then((results) => {
        this.render(results);
        this.renderFullscreen = false;
      });
    },

    search: function(input) {
      return new Promise((resolve, reject) => {
        if (!eme.api.Apps) {
          reject();
          return;
        }

        this.request = eme.api.Apps.search({
          'query': input
        });

        this.request.then((data) => {
          var response = data.response;
          if (response && response.apps && response.apps.length) {
            var results = [];
            response.apps.forEach(app => {
              results.push({
                dedupeId: app.appUrl,
                data: new GaiaGrid.Bookmark({
                  id: app.appUrl,
                  name: app.name,
                  url: app.appUrl,
                  icon: app.icon,
                  renderer: GridIconRenderer.TYPE.CLIP
                }, {
                  search: true}
                )
              });
            });
            resolve(results);
          }
        }, (reason) => {
          reject();
        });
      });
    }
  };

  Search.provider(new WebResults(window.eme));

}());
