/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function startup() {
  function handleInitLogo() {
    var initlogo = document.getElementById('initlogo');
    if (initlogo.classList.contains('hide')) {
      return;
    }

    initlogo.classList.add('hide');
    initlogo.addEventListener('transitionend', function delInitlogo() {
      initlogo.removeEventListener('transitionend', delInitlogo);
      initlogo.parentNode.removeChild(initlogo);
    });
  };

  function launchFirstRun() {
    // Hold on the 'home' key until a proper exit of the first run
    // configuration.
    var noHome = function(e) {
      e.preventDefault();
    };
    window.addEventListener('beforeattentionscreenhide', noHome, true);

    // Wait for the firstrun application to show up to fade the initlogo
    window.addEventListener('mozbrowserloadend', function onFirstRun(e) {
      var frame = e.target;
      if (frame.dataset.frameType != 'attention') {
        return;
      }
      window.removeEventListener('mozbrowserloadend', onFirstRun);

      var lockscreen = document.getElementById('lockscreen');

      frame.mozRequestFullScreen();
      window.addEventListener('mozfullscreenchange', function onfullscreen(e) {
        window.removeEventListener('mozfullscreenchange', onfullscreen);

        setTimeout(function() {
          lockscreen.style.display = 'none';
          handleInitLogo();
        });
      });

      frame.addEventListener('mozbrowserclose', function onFirstRunEnd(e) {
        window.removeEventListener('mozbrowserclose', onFirstRunEnd);
        window.removeEventListener('beforeattentionscreenhide', noHome, true);
        lockscreen.style.display = 'block';
      });
    });

    // Look for someone listening the firstrun message
    for (var manifestURL in Applications.installedApps) {
      var app = Applications.installedApps[manifestURL];
      var messages = app.manifest.messages;
      if (!messages) {
        continue;
      }

      for (var key in messages) {
        var message = messages[key];
        if (message['firstrun']) {
          // Emulate a system message until there is really one.
          // https://bugzilla.mozilla.org/show_bug.cgi?id=793557
          var evt = document.createEvent('CustomEvent');
          evt.initCustomEvent('mozChromeEvent', true, false, {
            type: 'open-app',
            isActivity: false,
            manifestURL: manifestURL,
            url: manifestURL.replace('manifest.webapp', message['firstrun'])
          });
          window.dispatchEvent(evt);
        }
      }
    }
  }

  function launchHomescreen(needFirstRun) {
    var activity = new MozActivity({
      name: 'view',
      data: { type: 'application/x-application-list' }
    });

    var homescreenLaunchCallback = function() {
      if (needFirstRun) {
        launchFirstRun();
      } else {
        handleInitLogo();
      }
    }

    activity.onsuccess = homescreenLaunchCallback;

    activity.onerror = function homescreenLaunchError() {
      console.error('Failed to launch home screen with activity.');
      homescreenLaunchCallback();
    };
  }

  asyncStorage.getItem('system.lastRun', function getLastRun(value) {
    var needFirstRun = !value;
    // XXX
    needFirstRun = true;
    asyncStorage.setItem('system.lastRun', Date.now());

    if (Applications.ready) {
      launchHomescreen(needFirstRun);
    } else {
      window.addEventListener('applicationready', function onAppReady() {
        launchHomescreen(needFirstRun);
      });
    }
  });

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
  // It seems it needs to be in both window_manager.js and bootstrap.js.
  function dumbListener2(event) {}
  window.addEventListener('devicemotion', dumbListener2);

  window.setTimeout(function() {
    window.removeEventListener('devicemotion', dumbListener2);
  }, 2000);
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
  'wallpaper.image',
  'resources/images/backgrounds/default.png',
  function setWallpaper(value) {
    document.getElementById('screen').style.backgroundImage =
      'url(' + value + ')';
  }
);
