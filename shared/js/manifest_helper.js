/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Helper object to access manifest information with locale support.
 */

var ManifestHelper = function(manifest) {
  var localeRoot = manifest;
  var locales = manifest.locales;

  if (locales) {
    var lang = document.documentElement.lang;

    // If there is a manifest entry for the curret locale, use it, otherwise
    // fallback on the default manifest.
    localeRoot = locales[lang] || locales[lang.split('-')[0]] || manifest;
  }

  // Bind the localized property values.
  for (var prop in manifest) {
    this[prop] = localeRoot[prop] || manifest[prop];
  }
};
