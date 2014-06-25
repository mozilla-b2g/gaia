/* global Search, DataGridProvider, GaiaGrid, Promise */

(function() {

  'use strict';

  const NUM_DISPLAY = 4;
  const API = 'https://marketplace.firefox.com/api/v1/apps/search/rocketbar/' +
    '?q={q}' +
    '&limit=' + NUM_DISPLAY +
    '&lang=' + document.documentElement.lang +
    '&region=restofworld';

  function Marketplace() {}

  Marketplace.prototype = {

    __proto__: DataGridProvider.prototype,

    name: 'Marketplace',

    dedupes: true,
    dedupeStrategy: 'exact',
    remote: true,

    search: function(input) {
      return new Promise((resolve, reject) => {
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
              dedupeId: app.manifest_url,
              data: new GaiaGrid.MarketPlaceApp({
                id: app.manifest_url,
                name: navigator.mozL10n.get('install-marketplace-title', {
                  title: app.name
                }),
                icon: app.icon,
                slug: app.slug
              })
            });
          }
          resolve(formatted);
        }).bind(this);
        req.onerror = function onerror() {
          console.log('Marketplace error.');
          reject();
        };
        req.ontimeout = function ontimeout() {
          console.log('Marketplace timeout.');
          reject();
        };
        req.send();
        this.request = req;
      });
    }
  };

  Search.provider(new Marketplace());
}());
