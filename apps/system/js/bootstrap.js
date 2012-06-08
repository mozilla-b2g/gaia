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

  Applications.rebuild(function start(apps) {
    // FIXME Loop over all the registered activities from the applications
    //       list and start up the first application found registered for
    //       the HOME activity.
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

    ScreenManager.turnScreenOn();
  });

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


var Applications = {
  installedApps: [],
  rebuild: function a_rebuild(callback) {
    var self = this;
    navigator.mozApps.mgmt.getAll().onsuccess = function(evt) {
      var apps = evt.target.result;
      apps.forEach(function(app) {
        self.installedApps[app.origin] = app;
      });

      if (callback)
        callback();
    };
  },

  getByOrigin: function a_getByOrigin(origin) {
    return this.installedApps[origin];
  },

  handleEvent: function a_handleEvent(evt) {
    var detail = evt.detail;
    if (detail.type !== 'webapps-ask-install')
      return;

    // This is how we say yes or no to the request after the user decides
    var self = this;
    function sendResponse(id, allow) {
      self.rebuild();

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, {
        id: id,
        type: allow ? 'webapps-install-granted' : 'webapps-install-denied'
      });
      window.dispatchEvent(event);
    }

    var app = detail.app;
    if (document.location.toString().indexOf(app.installOrigin) == 0) {
      sendResponse(detail.id, true);
      return;
    }

    var name = app.manifest.name;
    var locales = app.manifest.locales;
    var lang = navigator.language;
    if (locales && locales[lang] && locales[lang].name)
      name = locales[lang].name;

    var str = document.mozL10n.get('install', {
      'name': name, 'origin': app.origin
    });
    requestPermission(str, function() { sendResponse(detail.id, true); },
                           function() { sendResponse(detail.id, false); });
  }
};

window.addEventListener('mozChromeEvent', Applications);

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

