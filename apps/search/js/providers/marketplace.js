(function() {

  'use strict';

  const NUM_DISPLAY = 8;
  const API = 'https://marketplace.firefox.com/api/v1/apps/search/?q={q}';

  function Marketplace() {
    this.name = 'Marketplace';
  }

  Marketplace.prototype = {

    init: function(config) {
      this.container = config.container;
      this.container.addEventListener('click', this.click);
    },

    click: function(e) {
      Search.close();
      var slug = e.target.dataset.slug;
      var activity = new MozActivity({
        name: 'marketplace-app',
        data: {
          slug: slug
        }
      });

      activity.onerror = function onerror() {
        Search.browse('https://marketplace.firefox.com/app/' + slug);
      };
    },

    search: function(input) {
      this.clear();

      var req = new XMLHttpRequest();
      req.open('GET', API.replace('{q}', input), true);
      req.onload = (function onload() {
        var results = JSON.parse(req.responseText);
        if (!results.meta.total_count) {
          return;
        }

        var frag = document.createDocumentFragment();
        var length = Math.min(NUM_DISPLAY, results.meta.total_count);
        for (var i = 0; i < length; i++) {
          var el = document.createElement('div');
          var app = results.objects[i];
          el.dataset.slug = app.slug;

          var img = document.createElement('img');
          img.src = app.icons['64'];
          el.appendChild(img);

          var nameL10n = '';
          for (var locale in app.name) {
            // Default the app name if we haven't found a matching locale
            nameL10n = nameL10n || app.name[locale];
            // Overwrite if the locale matches
            if (locale === document.documentElement.lang) {
              nameL10n = app.name[locale];
            }
          }

          var title = document.createTextNode(nameL10n);
          el.appendChild(title);

          frag.appendChild(el);
        }
        this.container.appendChild(frag);
      }).bind(this);
      req.onerror = function onerror() {
        console.log('Marketplace error.');
      };
      req.ontimeout = function ontimeout() {
        console.log('Marketplace timeout.');
      };
      req.send();
    },

    clear: function() {
      this.container.innerHTML = '';
    }
  };

  Search.provider(new Marketplace());
}());
