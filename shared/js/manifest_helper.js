/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// Start Outer IIFE
(function(exports) {
'use strict';

// helper function, bound to manifest and property name in constructor
function ManifestHelper_get(prop) {
  var manifest = this;
  var value = manifest[prop];

  // if this stage of the manifest has locales
  if (manifest.locales) {
    var lang = document.documentElement.lang || '';

    // try to replace values from the locales object using the best language
    // match.  stop when a replacement is found
    [lang, lang.substr(0, lang.indexOf('-'))].some(function tryLanguage(lang) {
      // this === manifest.locales
      if (this[lang] && this[lang][prop]) {
        value = this[lang][prop];
        // aborts [].some
        return true;
      }
    }, manifest.locales);
  }

  // return a new ManifestHelper for any object children
  if (typeof value === 'object' && !(value instanceof Array)) {
    value = new ManifestHelper(value);
  }
  return value;
}

/**
 * Helper object to access manifest information with locale support.
 *
 * @constructor
 * @param {Object} manifest The app manifest.
 */
function ManifestHelper(manifest) {
  // Bind getters for the localized property values.
  for (var prop in manifest) {
    Object.defineProperty(this, prop, {
      get: ManifestHelper_get.bind(manifest, prop),
      enumerable: true
    });
  }
};

exports.ManifestHelper = ManifestHelper;

// End outer IIFE
}(window));


