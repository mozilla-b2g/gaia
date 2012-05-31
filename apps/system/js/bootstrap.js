/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function startup() {
  LockScreen.init();
  PinLock.init();
  StatusBar.init();
  KeyHandler.init();
  SoundManager.init();
  SleepMenu.init();

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
  window.addEventListener("devicemotion", dumbListener2, false);

  window.setTimeout(function() {
    window.removeEventListener("devicemotion", dumbListener2, false);
  }, 2000);
}

var SleepMenu = {
  get element() {
    delete this.element;
    return this.element = document.getElementById('sleep');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  init: function sm_init() {
    window.addEventListener('click', SleepMenu, true);
    window.addEventListener('keyup', SleepMenu, true);
  },

  show: function sm_show() {
    this.element.classList.add('visible');
  },

  hide: function sm_hide() {
    this.element.classList.remove('visible');
  },

  handleEvent: function sm_handleEvent(evt) {
    if (!this.visible)
      return;

    switch (evt.type) {
      case 'click':
        var action = evt.target.dataset.value;
        switch (action) {
          case 'airplane':
            var settings = window.navigator.mozSettings;
            if (settings)
              settings.getLock().set({ 'ril.radio.disabled': true});

            break;
          case 'silent':
            var settings = window.navigator.mozSettings;
            if (settings)
              settings.getLock().set({ 'phone.ring.incoming': false});

            document.getElementById('silent').hidden = true;
            document.getElementById('normal').hidden = false;
            break;
          case 'normal':
            var settings = window.navigator.mozSettings;
            if (settings)
              settings.getLock().set({'phone.ring.incoming': true});

            document.getElementById('silent').hidden = false;
            document.getElementById('normal').hidden = true;
            break;
          case 'restart':
            navigator.mozPower.reboot();
            break;
          case 'power':
            navigator.mozPower.powerOff();
            break;
        }
        this.hide();
        break;

      case 'keyup':
        if (evt.keyCode == evt.DOM_VK_ESCAPE ||
            evt.keyCode == evt.DOM_VK_HOME) {

            this.hide();
            evt.preventDefault();
            evt.stopPropagation();
         }
        break;
    }
  }
};

/* === Source View === */
var SourceView = {
  get viewer() {
    return document.getElementById('appViewsource');
  },

  get active() {
    return !this.viewer ? false : this.viewer.style.visibility === 'visible';
  },

  show: function sv_show() {
    var viewsource = this.viewer;
    if (!viewsource) {
      var style = '#appViewsource { ' +
                  '  position: absolute;' +
                  '  top: -moz-calc(10%);' +
                  '  left: -moz-calc(10%);' +
                  '  width: -moz-calc(80% - 2 * 15px);' +
                  '  height: -moz-calc(80% - 2 * 15px);' +
                  '  visibility: hidden;' +
                  '  margin: 15px;' +
                  '  background-color: white;' +
                  '  opacity: 0.92;' +
                  '  color: black;' +
                  '  z-index: 9999;' +
                  '}';
      document.styleSheets[0].insertRule(style, 0);

      viewsource = document.createElement('iframe');
      viewsource.id = 'appViewsource';
      document.body.appendChild(viewsource);

      window.addEventListener('locked', this);
    }

    var url = WindowManager.getDisplayedApp();
    if (!url)
      // Assume the home screen is the visible app.
      url = window.location.toString();
    viewsource.src = 'view-source: ' + url;
    viewsource.style.visibility = 'visible';
  },

  hide: function sv_hide() {
    var viewsource = this.viewer;
    if (viewsource) {
      viewsource.style.visibility = 'hidden';
      viewsource.src = 'about:blank';
    }
  },

  toggle: function sv_toggle() {
    this.active ? this.hide() : this.show();
  },

  handleEvent: function sv_handleEvent(evt) {
    switch (evt.type) {
      case 'locked':
        this.hide();
        break;
    }
  }
};

/* === KeyHandler === */
var KeyHandler = {
  init: function kh_init() {
    window.addEventListener('keydown', this);
    window.addEventListener('keyup', this);
  },

  handleEvent: function kh_handleEvent(evt) {
    if (!navigator.mozPower.screenEnabled)
      return;

    switch (evt.type) {
      case 'keydown':
        break;
      case 'keyup':
        switch (evt.keyCode) {
          case evt.DOM_VK_CONTEXT_MENU:
            SourceView.toggle();
            break;

          case evt.DOM_VK_F6:
            document.location.reload();
            break;
        }
        break;
    }
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


