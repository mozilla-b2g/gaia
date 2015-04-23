/* global Search, DataGridProvider, GaiaGrid, Promise */

(function() {

  'use strict';

  const NUM_DISPLAY = 4;
  var apiUrl = null;

  function Marketplace() {}

  Marketplace.prototype = {

    __proto__: DataGridProvider.prototype,

    name: 'Marketplace',

    dedupes: true,
    dedupeStrategy: 'exact',
    remote: true,

    init: function() {

      DataGridProvider.prototype.init.apply(this, arguments);
      var urlKey = 'search.marketplace.url';
      var req = navigator.mozSettings.createLock().get(urlKey);
      req.onsuccess = function () {
        if (req.result[urlKey]) {
          apiUrl = req.result[urlKey]
            .replace('{limit}', NUM_DISPLAY)
            .replace('{lang}', document.documentElement.lang);
        }
      };
    },

    search: function(input) {
      return new Promise((resolve, reject) => {
        this.abort();

        if (!input || !apiUrl) {
          return reject();
        }

        var req = new XMLHttpRequest();
        req.open('GET', apiUrl.replace('{q}', encodeURIComponent(input)), true);
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
                icons: app.icons,
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
