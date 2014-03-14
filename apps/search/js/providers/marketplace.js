/* global Provider, MozActivity, Search */

(function() {

  'use strict';

  const NUM_DISPLAY = 4;
  const API = 'https://marketplace.firefox.com/api/v1/apps/search/rocketbar/' +
    '?q={q}' +
    '&limit=' + NUM_DISPLAY +
    '&lang=' + document.documentElement.lang;

  function Marketplace() {}

  Marketplace.prototype = {

    __proto__: Provider.prototype,

    name: 'Marketplace',

    dedupes: true,
    dedupeStrategy: 'exact',

    click: function(e) {
      var slug = e.target.dataset.slug;
      var activity = new MozActivity({
        name: 'marketplace-app',
        data: {
          slug: slug
        }
      });

      activity.onerror = function onerror() {
        Search.navigate('https://marketplace.firefox.com/app/' + slug);
      };
    },

    search: function(input, collect) {
      this.clear();
      this.abort();

      if (!input) {
        return;
      }

      var req = new XMLHttpRequest();
      req.open('GET', API.replace('{q}', input), true);
      req.onload = (function onload() {
        var results = JSON.parse(req.responseText);
        if (!results.length) {
          return;
        }

        var length = Math.min(NUM_DISPLAY, results.length);
        var formatted = [];
        for (var i = 0; i < length; i++) {
          var app = results[i];

          formatted.push({
            title: navigator.mozL10n.get('install-marketplace-title',
              {title: app.name}),
            icon: app.icon,
            dedupeId: app.manifest_url,
            dataset: {
              slug: app.slug
            }
          });
        }
        collect(formatted);
      }).bind(this);
      req.onerror = function onerror() {
        console.log('Marketplace error.');
      };
      req.ontimeout = function ontimeout() {
        console.log('Marketplace timeout.');
      };
      req.send();
      this.request = req;
    }
  };

  Search.provider(new Marketplace());
}());
