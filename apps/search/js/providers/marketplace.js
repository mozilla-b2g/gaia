/* global Provider, MozActivity, Search */

(function() {

  'use strict';

  const NUM_DISPLAY = 4;
  const API = 'https://marketplace.firefox.com/api/v1/apps/search/?q={q}';

  function Marketplace() {}

  Marketplace.prototype = {

    __proto__: Provider.prototype,

    name: 'Marketplace',

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

    search: function(input) {
      this.clear();
      this.abort();

      var req = new XMLHttpRequest();
      req.open('GET', API.replace('{q}', input), true);
      req.onload = (function onload() {
        var results = JSON.parse(req.responseText);
        if (!results.meta.total_count) {
          return;
        }

        var length = Math.min(NUM_DISPLAY, results.meta.total_count);
        var formatted = [];
        for (var i = 0; i < length; i++) {
          var app = results.objects[i];

          var nameL10n = '';
          for (var locale in app.name) {
            // Default the app name if we haven't found a matching locale
            nameL10n = nameL10n || app.name[locale];
            // Overwrite if the locale matches
            if (locale === document.documentElement.lang) {
              nameL10n = app.name[locale];
            }
          }

          formatted.push({
            title: navigator.mozL10n.get('install-marketplace-title',
              {title: nameL10n}),
            icon: app.icons['64'],
            dataset: {
              slug: app.slug
            }
          });
        }
        this.render(formatted);
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
