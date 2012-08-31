/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function startup() {
  PinLock.init();
  SourceView.init();
  Shortcuts.init();

  // We need to be sure to get the focus in order to wake up the screen
  // if the phone goes to sleep before any user interaction.
  // Apparently it works because no other window has the focus at this point.
  window.focus();

  // This is code copied from
  // http://dl.dropbox.com/u/8727858/physical-events/index.html
  // It appears to workaround the Nexus S bug where we're not
  // getting orientation data.  See:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=753245
  function dumbListener2(event) {}
  window.addEventListener('devicemotion', dumbListener2);

  window.setTimeout(function() {
    window.removeEventListener('devicemotion', dumbListener2);
  }, 2000);

  navigator.mozApps.mgmt.getAll().onsuccess = function() {
    new MozActivity({
      name: 'view',
      data: {
        type: 'application/x-application-list'
      }
    });
  }
}

/* === Shortcuts === */
/* For hardware key handling that doesn't belong to anywhere */
var Shortcuts = {
  init: function rm_init() {
    window.addEventListener('keyup', this);
  },

  handleEvent: function rm_handleEvent(evt) {
    if (!ScreenManager.screenEnabled || evt.keyCode !== evt.DOM_VK_F6)
      return;

    document.location.reload();
  }
};

/* === Localization === */
/* set the 'lang' and 'dir' attributes to <html> when the page is translated */
window.addEventListener('localized', function onlocalized() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});

// Define the default background to use for all homescreens
SettingsListener.observe(
  'homescreen.wallpaper', 'default.png', function setWallpaper(value) {
  var url = 'url(resources/images/backgrounds/' + value + ')';
  document.getElementById('screen').style.backgroundImage = url;
});
