/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('load', function startup() {
  function safelyLaunchFTU() {
    WindowManager.retrieveHomescreen(FtuLauncher.retrieve.bind(FtuLauncher));
  }

  if (Applications.ready) {
    safelyLaunchFTU();
  } else {
    window.addEventListener('applicationready', function appListReady(event) {
      window.removeEventListener('applicationready', appListReady);
      safelyLaunchFTU();
    });
  }

  window.addEventListener('ftudone', function doneWithFTU() {
    window.removeEventListener('ftudone', doneWithFTU);

    var lock = window.navigator.mozSettings.createLock();
    lock.set({
      'gaia.system.checkForUpdates': true
    });
  });

  SourceView.init();
  Shortcuts.init();
  ScreenManager.turnScreenOn();

  // We need to be sure to get the focus in order to wake up the screen
  // if the phone goes to sleep before any user interaction.
  // Apparently it works because no other window has the focus at this point.
  window.focus();

  // This is code copied from
  // http://dl.dropbox.com/u/8727858/physical-events/index.html
  // It appears to workaround the Nexus S bug where we're not
  // getting orientation data.  See:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=753245
  // It seems it needs to be in both window_manager.js and bootstrap.js.
  function dumbListener2(event) {}
  window.addEventListener('devicemotion', dumbListener2);

  window.setTimeout(function() {
    window.removeEventListener('devicemotion', dumbListener2);
  }, 2000);
});

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
  'wallpaper.image',
  'resources/images/backgrounds/default.png',
  function setWallpaper(value) {
    document.getElementById('screen').style.backgroundImage =
      'url(' + value + ')';
  }
);


/* === XXX Bug 900512 === */
// On some devices touching the hardware home button triggers
// touch events at position 0,0. In order to make sure those does
// not trigger unexpected behaviors those are captured here.
function cancelHomeTouchstart(e) {
  if (e.touches[0].pageX === 0 && e.touches[0].pageY === 0) {
    e.stopImmediatePropagation();
  }
}

function cancelHomeTouchend(e) {
  if (e.touches[0].pageX === 0 && e.touches[0].pageY === 0) {
    e.stopImmediatePropagation();
  }
}

window.addEventListener('touchstart', cancelHomeTouchstart, true);
window.addEventListener('touchstart', cancelHomeTouchend, true);
