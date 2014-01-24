/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global SettingsURL, SettingsListener */

'use strict';

(function() {
  var wallpaperURL = new SettingsURL();

  SettingsListener.observe(
    'wallpaper.image',
    'resources/images/backgrounds/default.png',
    function(value) {
      var evt = new CustomEvent('wallpaperchange',
        { bubbles: true, cancelable: false,
          detail: { url: wallpaperURL.set(value) } });
      window.dispatchEvent(evt);
    }
  );
})();
