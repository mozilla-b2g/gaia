/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// Start Outer IIFE
(function(exports) {
'use strict';

// helper function, bound to manifest and property name in constructor
function ManifestHelper_get(prop) {
  var manifest = this;
  var value = manifest[prop];

  var lang = navigator.mozL10n.language.code || '';

  if (lang in navigator.mozL10n.qps &&
      (prop === 'name' || prop === 'description' || prop == 'short_name')) {
    value = navigator.mozL10n.qps[navigator.language].translate(value);
  } else if (manifest.locales) {
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
}

/**
 * Getter for display name (short_name if defined, otherwise name).
 */
Object.defineProperty(ManifestHelper.prototype, 'displayName', {
    get: function displayName() {
      return this.short_name || this.name;
    }
});

exports.ManifestHelper = ManifestHelper;

// End outer IIFE
}(window));
