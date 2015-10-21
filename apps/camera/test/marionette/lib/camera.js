/* global marionette */
'use strict';

function Camera(client) {
  this.client = client || marionette.client();
  this.$ = require('./vendor/mquery')(client);
  this.touches = [];
}

Camera.prototype = {
  URL: 'app://camera.gaiamobile.org',

  selectors : {
    controls : '.test-controls',
    viewfinder : '.viewfinder.js-viewfinder',
    recordingTimer: '.recording-timer',
    hud : '.hud',
    modeSwitch: '.test-switch',
    thumbnail: '.test-thumbnail',
    capture: '.test-capture',
    cameraToggle: '.test-camera-toggle',
    flash: '.test-flash-button',
    settingsToggle: '.test-settings-toggle',
    settingsPanel: '.settings',
    settingOptionsPanel: '.setting-options',
    onOption: '.setting-option[data-key=on]',
    offOption: '.setting-option[data-key=off]',
    gridSettings: '.test-grid-setting',
    selfTimerSettings: '.test-self-timer-setting',
    selfTimer2SecondsOption: '.setting-option[data-key=secs2]',
    selfTimerCountDown : '.countdown',
    notification: '.notification li',
    grid: '.viewfinder-grid',
    zoomBar: '.zoom-bar',
  },

  launch: function() {
    this.client.apps.launch(this.URL);
    this.client.apps.switchToApp(this.URL);
    this.waitForPreviewReady();
  },

  close: function() {
    this.client.apps.close(this.URL);
  },

  tap: function(selector) {
    this.$(selector).tap();
  },

  addOrReplaceTouch: function(identifier, x, y) {
    var touches = this.touches;
    for (var i = 0, length = touches.length; i < length; i++) {
      if (touches[i].identifier === identifier) {
        touches[i].x = x;
        touches[i].y = y;
        return;
      }
    }

    touches.push({
      identifier: identifier,
      x: x,
      y: y
    });
  },

  removeTouch: function(identifier) {
    var touches = this.touches;
    for (var i = 0, length = touches.length; i < length; i++) {
      if (touches[i].identifier === identifier) {
        touches.splice(i, 1);
        return;
      }
    }
  },

  touch: function(selector, type, identifier, x, y) {
    var eventName = 'touch' + type;
    if (eventName === 'touchend') {
      this.removeTouch(identifier);
    } else {
      this.addOrReplaceTouch(identifier, x, y);
    }

    var el = this.$(selector).waitToAppear().el;
    el.scriptWith(dispatchTouchEvent, [this.touches, eventName]);

    function dispatchTouchEvent(el, touches, eventName) {
      var fakeTouches = [];
      touches.forEach(function(touch) {
        fakeTouches.push(
          document.createTouch(window, el, touch.identifier, touch.x, touch.y));
      });

      var touchList = document.createTouchList(fakeTouches);
      var touchEvent = document.createEvent('TouchEvent');
      touchEvent.initTouchEvent(eventName,  // name
                                true,       // bubbles
                                true,       // cancelable
                                window,     // view
                                null,       // detail
                                false,      // ctrlKey
                                false,      // altKey
                                false,      // shiftKey
                                false,      // metaKey
                                touchList,  // touches
                                touchList,  // targetTouches
                                touchList); // changedTouches

      el.dispatchEvent(touchEvent);
    }
  },

  pinch: function(selector, options) {
    var x = options.x || 100;
    var y = options.y || 100;
    var distance = options.distance || 10;
    var halfDistance = Math.abs(distance) / 2;
    var inTouch1 = {
      x: x,
      y: y
    };
    var inTouch2 = {
      x: x + 1,
      y: y + 1
    };
    var outTouch1 = {
      x: x - halfDistance,
      y: y - halfDistance
    };
    var outTouch2 = {
      x: x + 1 + halfDistance,
      y: y + 1 + halfDistance
    };

    var startTouches;
    var endTouches;

    // Zoom in
    if (distance > 0) {
      startTouches = [inTouch1, inTouch2];
      endTouches = [outTouch1, outTouch2];
    }

    // Zoom out
    else {
      startTouches = [outTouch1, outTouch2];
      endTouches = [inTouch1, inTouch2];
    }

    this.touch(selector, 'start', 1, startTouches[0].x, startTouches[0].y);
    this.touch(selector, 'start', 2, startTouches[1].x, startTouches[1].y);
    this.touch(selector, 'move', 1, endTouches[0].x, endTouches[0].y);
    this.touch(selector, 'move', 2, endTouches[1].x, endTouches[1].y);
    this.touch(selector, 'end', 1);
    this.touch(selector, 'end', 2);
  },

  waitFor: function(selector) {
    client.helper.waitForElement(selector);
  },

  tapCapture: function() {
    this.tap(this.selectors.capture);
  },

  tapModeSwitch: function() {
    this.tap(this.selectors.modeSwitch);
  },

  tapSettings: function() {
    this.tap(this.selectors.settingsToggle);
  },

  tapCameraToggle: function() {
    this.tap(this.selectors.cameraToggle);
  },

  tapGridSettings: function() {
    this.tap(this.selectors.gridSettings);
  },

  tapOnOption: function() {
    this.tap(this.selectors.onOption);
  },

  tapOffOption: function() {
    this.tap(this.selectors.offOption);
  },

  tapSelfTimerSettings: function() {
    this.tap(this.selectors.selfTimerSettings);
  },

  tapSelfTimer2SecsOption: function() {
    this.tap(this.selectors.selfTimer2SecondsOption);
  },

  tapFlash: function() {
    this.tap(this.selectors.flash);
  },

  waitForSettingsPanel: function() {
    this.waitFor(this.selectors.settingsPanel);
  },

  waitForSettingOptionsPanel: function() {
    this.waitFor(this.selectors.settingOptionsPanel);
  },

  waitForThumbnail: function() {
    this.waitFor(this.selectors.thumbnail);
  },

  waitForRecordingTimer: function() {
    this.waitFor(this.selectors.recordingTimer + '.visible');
  },

  waitForNotification: function() {
    this.waitFor(this.selectors.notification);
  },

  waitForHudReady: function() {
    this.waitFor(this.selectors.hud + '.visible[camera=ready]')
  },

  waitForPreviewReady: function() {
    this.waitFor(this.selectors.viewfinder + '.visible');
  },

  waitForControlsEnabled: function() {
    this.waitFor(this.selectors.controls + '.enabled')
  },

  waitForGridOn: function() {
    this.waitFor(this.selectors.viewfinder + '[grid=on]');
  },

  waitForGridOff: function() {
    this.waitFor(this.selectors.viewfinder + '[grid=off]');
  },

  waitForViewfinderEnabled: function() {
    this.waitFor(this.selectors.viewfinder + '[enabled=true]');
  },

  waitForViewfinderDisabled: function() {
    this.waitFor(this.selectors.viewfinder + '[enabled=false]');
  },

  waitForCountDown: function() {
    this.waitFor(this.selectors.selfTimerCountDown + '.visible');
  },

  waitForZoomBarEnabled: function() {
    this.waitFor(this.selectors.zoomBar + '.zooming');
  },

  waitForZoomBarDisabled: function() {
    this.waitFor(this.selectors.zoomBar + ':not(.zooming)');
  },

  get mode() {
    var controls = this.selectors.controls;
    if(this.$(controls + '[mode=picture]')[0]) {
      return 'picture';
    } else {
      return 'video';
    }
  },

  get flash() {
    var hud = this.selectors.hud;
    return this.$(hud + '[flash-enabled=true]')[0];
  },

  get frontCamera() {
    var hud = this.selectors.hud;
    return this.$(hud + '[camera-enabled=true]')[0];
  }

};

module.exports = Camera;
