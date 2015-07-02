/* exported NotificationHelper */
(function(window) {
  'use strict';

  window.NotificationHelper = {
    getIconURI: function nh_getIconURI(app, entryPoint) {
      var icons = app.manifest.icons;

      if (entryPoint) {
        icons = app.manifest.entry_points[entryPoint].icons;
      }

      if (!icons) {
        return null;
      }

      var sizes = Object.keys(icons).map(function parse(str) {
        return parseInt(str, 10);
      });
      sizes.sort(function(x, y) { return y - x; });

      var HVGA = document.documentElement.clientWidth < 480;
      var index = sizes[HVGA ? sizes.length - 1 : 0];
      return app.installOrigin + icons[index];
    },

    // titleL10n and options.bodyL10n may be:
    // a string -> l10nId
    // an object -> {id: l10nId, args: l10nArgs}
    // an object -> {raw: string}
    send: function nh_send(titleL10n, options) {
      return Promise.all([titleL10n, options.bodyL10n].map(getL10n)).then(
        ([title, body]) => {
          if (body) {
            options.body = body;
          }
          options.dir = navigator.mozL10n.language.direction;
          options.lang = navigator.mozL10n.language.code;

          var notification = new window.Notification(title, options);

          if (options.closeOnClick !== false) {
            notification.addEventListener('click', function nh_click() {
              notification.removeEventListener('click', nh_click);
              notification.close();
            });
          }

          return notification;
        });
    },
  };

  function getL10n(l10nAttrs) {
    if (!l10nAttrs) {
      return;
    }
    if (typeof l10nAttrs === 'string') {
      return navigator.mozL10n.formatValue(l10nAttrs);
    }
    if (l10nAttrs.raw) {
      return l10nAttrs.raw;
    }
    return navigator.mozL10n.formatValue(l10nAttrs.id, l10nAttrs.args);
  }
})(this);
