'use strict';
/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
(function(exports) {
  /**
   * CardsHelper provides utilities and helper methods
   * for dealing with task manager / card view and their cards
   *
   * @module CardsHelper
   */

  var HVGA;

  function isHVGA() {
    if (undefined === HVGA) {
      HVGA = document.documentElement.clientWidth < 480;
    }
    return HVGA;
  }

  function getIconURIForApp(app) {
    if (!app) {
      return null;
    }
    var icons = app.manifest && app.manifest.icons;
    var iconPath;

    if (icons) {
      var sizes = Object.keys(icons).map(function parse(str) {
        return parseInt(str, 10);
      });

      sizes.sort(function(x, y) { return y - x; });

      var index = sizes[(HVGA) ? sizes.length - 1 : 0];
      iconPath = icons[index];
    } else {
      iconPath = app.icon;
    }

    if (!iconPath) {
      return null;
    }

    if (iconPath.indexOf('data:') !== 0) {
      // We need to resolve iconPath as a relative url to origin, since
      // origin can be a full url in some apps.
      var base = getOriginObject(app.origin);
      var port = base.port ? (':' + base.port) : '';
      iconPath = base.protocol + '//' + base.hostname + port + iconPath;
    }

    return iconPath;
  }

  function getOriginObject(url) {
    var parser = document.createElement('a');
    parser.href = url;

    return {
      protocol: parser.protocol,
      hostname: parser.hostname,
      port: parser.port
    };
  }

  function getOffOrigin(src, origin) {
    // Use src and origin as cache key
    var cacheKey = JSON.stringify(Array.prototype.slice.call(arguments));
    if (!getOffOrigin.cache[cacheKey]) {
      var native = getOriginObject(origin);
      var current = getOriginObject(src);
      if (current.protocol == 'http:') {
        // Display http:// protocol anyway
        getOffOrigin.cache[cacheKey] = current.protocol + '//' +
          current.hostname;
      } else if (native.protocol == current.protocol &&
        native.hostname == current.hostname &&
        native.port == current.port) {
        // Same origin policy
        getOffOrigin.cache[cacheKey] = '';
      } else if (current.protocol == 'app:') {
        // Avoid displaying app:// protocol
        getOffOrigin.cache[cacheKey] = '';
      } else {
        getOffOrigin.cache[cacheKey] = current.protocol + '//' +
          current.hostname;
      }
    }

    return getOffOrigin.cache[cacheKey];
  }
  getOffOrigin.cache = {};

  function escapeHTML(str, escapeQuotes) {
    var stringHTML = str;
    stringHTML = stringHTML.replace(/</g, '&#60;');// jshint ignore: line
    stringHTML = stringHTML.replace(/(\r\n|\n|\r)/gm, '<br/>');
    stringHTML = stringHTML.replace(/\s\s/g, ' &nbsp;');

    if (escapeQuotes) {
      // The //" is to help dumb editors understand that there's not a
      // open string at EOL.
      return stringHTML.replace(/"/g, '&quot;') //"
                       .replace(/'/g, '&#x27;');
    }
    return stringHTML;
  }

  exports.CardsHelper = {
    getIconURIForApp: getIconURIForApp,
    getOriginObject: getOriginObject,
    getOffOrigin: getOffOrigin,
    escapeHTML: escapeHTML,
    isHVGA: isHVGA
  };

})(window);
