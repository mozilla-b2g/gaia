/* global marionette */
'use strict';

function Camera(client) {
  this.client = client || marionette.client();
  this.$ = require('./vendor/mquery')(client);
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
    selfTimerCountDown : '.timer',
    notification: '.notification li',
    grid: '.viewfinder-grid'
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
