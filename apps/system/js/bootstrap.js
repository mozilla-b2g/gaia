/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function startup() {
  PinLock.init();
  SoundManager.init();
  SleepMenu.init();
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
}

// XXX: homescreen should be an app launched and managed by window manager,
// instead of living in it's own frame.
(function homescreenLauncher() {
  if (document.location.protocol === 'file:') {
    var paths = document.location.pathname.split('/');
    paths.pop();
    paths.pop();
    var src = 'file://' + paths.join('/') + '/homescreen/index.html';
  } else {
    var host = document.location.host;
    var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
    var src = 'http://homescreen.' + domain;
  }
  document.getElementById('homescreen').src = src;
}());

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

/* === focuschange === */
/* XXX: should go to keyboard_manager.js */

try {
  window.navigator.mozKeyboard.onfocuschange = function onfocuschange(evt) {
    switch (evt.detail.type) {
      case 'blur':
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('hideime', true, true, {});
        window.dispatchEvent(event);
        break;

      default:
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('showime', true, true, evt.detail);
        window.dispatchEvent(event);
        break;
    }
  };
} catch (e) {}

/* === Localization ===
*  This thing here will push setting change into mozL10n for it to
*  load the new locale.
*  Each time mozL10n loads the new locale (including first load),
*  it will dispatch a 'localized' event.
*
*  XXX: mozL10n should handle setting change by itself if possible.
*
*/

(function l10n() {
  var called = false;
  SettingsListener.observe('language.current', 'en-US',
    (function localeChanged(lang) {
      // Skip the first callback firing
      if (!called) {
        called = true;
        return;
      }

      // Update <html> lang attribute
      document.documentElement.lang = lang;
      // Setting the code properties here will make mozL10n translate
      // HTML again
      document.mozL10n.language.code = lang;

      // Update <html> dir attribute
      document.documentElement.dir =
        document.mozL10n.language.direction;
    }).bind(this)
  );
})();
