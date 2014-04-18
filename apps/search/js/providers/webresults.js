/* global eme, Provider, Search */

(function() {

  'use strict';

  function GoogleLink() {}

  GoogleLink.prototype = {

    __proto__: Provider.prototype,

    name: 'GoogleLink',

    init: function() {
      Provider.prototype.init.apply(this, arguments);
    },

    click: function(e) {
      if (e.target.dataset.url) {
        window.open(e.target.dataset.url, '_blank', 'remote=true');
      }
    },

    search: function(input, collect) {
      this.render([{
        title: input + ' - Google search',
        dataset: {
          url: 'http://google.com?q=' + input
        }
      }]);
    }
  };


  function WebResults(eme) {}

  WebResults.prototype = {

    __proto__: Provider.prototype,

    name: 'WebResults',

    dedupes: true,
    dedupeStrategy: 'fuzzy',

    googleLink: new GoogleLink(),

    renderFullscreen: false,

    init: function() {
      Provider.prototype.init.apply(this, arguments);
      this.googleLink.init();
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

    clear: function() {
      Provider.prototype.clear.apply(this, arguments);
      this.googleLink.clear();
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
      this.googleLink.clear();

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
            if (!this.renderFullscreen && app.name === 'Google') {
              this.googleLink.search(input);
              return;
            }
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
