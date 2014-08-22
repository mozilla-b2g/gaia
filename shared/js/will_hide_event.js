//
// While the app is visible, listen for magic settings changes that
// are signals from the system app that we will soon be hidden, and
// emit a synthetic 'willhide' event when they occur. For apps like
// Camera, the visiblitychange event can arrive too late: see bugs
// 995540 and 1051172, for example.
//
// Note that this hack is needed when the phone is under heavy
// memory pressure and is swapping. So we want to be really careful
// to only listen for settings events when we actually are the
// foreground app. We don't want a bunch of background apps to have
// to wake up and handle an event every time the user presses the
// Home button: that would just make the swapping issues worse!
//
(function(exports) {
  'use strict';

  const homeScreenKey = 'private.broadcast.home_screen_opening';
  const attentionScreenKey = 'private.broadcast.attention_screen_opening';

  function start() {
    // If we are visible, start listening to settings events
    if (!document.hidden) {
      listen();
    }

    // And listen and unlisten as our visibility changes
    window.addEventListener('visibilitychange', visibilityChangeHandler);
  }

  function stop() {
    // Stop tracking visibility
    window.removeEventListener('visibilitychange', visibilityChangeHandler);

    // And stop listening to the settings db
    unlisten();
  }

  function visibilityChangeHandler() {
    if (document.hidden) {
      unlisten();  // If hidden, ignore setings changes
    }
    else {
      listen();    // If visible, respond to settings changes
    }
  }

  function listen() {
    navigator.mozSettings.addObserver(homeScreenKey, homeScreenObserver);
    navigator.mozSettings.addObserver(attentionScreenKey,
                                      attentionScreenObserver);
  }

  function unlisten() {
    navigator.mozSettings.removeObserver(homeScreenKey, homeScreenObserver);
    navigator.mozSettings.removeObserver(attentionScreenKey,
                                         attentionScreenObserver);
  }

  function homeScreenObserver(event) {
    if (event.settingValue) {
      emitWillHideEvent('home');
    }
  }

  function attentionScreenObserver(event) {
    if (event.settingValue) {
      emitWillHideEvent('attention');
    }
  }

  function emitWillHideEvent(why) {
    window.dispatchEvent(new CustomEvent('willhide', { detail: why }));
  }

  exports.WillHideEvent = {
    start: start,
    stop: stop
  };

}(window));
