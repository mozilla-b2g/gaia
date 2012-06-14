/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function startup() {
  ScreenManager.init();
  LockScreen.init();
  PinLock.init();
  StatusBar.init();
  SoundManager.init();
  SleepMenu.init();
  SourceView.init();
  Shortcuts.init();

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

// XXX This crap should live in webapi.js for compatibility
var Mouse2Touch = {
  'mousedown': 'touchstart',
  'mousemove': 'touchmove',
  'mouseup': 'touchend'
};

var Touch2Mouse = {
  'touchstart': 'mousedown',
  'touchmove': 'mousemove',
  'touchend': 'mouseup'
};

var ForceOnWindow = {
  'touchmove': true,
  'touchend': true
};

function AddEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.addEventListener(name, {
      handleEvent: function(e) {
        if (Mouse2Touch[e.type]) {
          var original = e;
          e = {
            type: Mouse2Touch[original.type],
            target: original.target,
            touches: [original],
            preventDefault: function() {
              original.preventDefault();
            }
          };
          e.changedTouches = e.touches;
        }
        return listener.handleEvent(e);
      }
    }, true);
  }
}

function RemoveEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.removeEventListener(name, listener);
  }
}

window.addEventListener('mozfullscreenchange', function onfullscreen(e) {
  var classes = document.getElementById('screen').classList;
  document.mozFullScreen ?
    classes.add('fullscreen') : classes.remove('fullscreen');
});

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

