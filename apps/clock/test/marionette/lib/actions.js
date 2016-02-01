/* global marionette */
'use strict';

var $ = require('./mquery');
var StopwatchActions = require('./stopwatch_actions');
var TimerActions = require('./timer_actions');
var AlarmActions = require('./alarm_actions');

function ClockAppActions(options) {
  this._client = marionette.client({
    profile: {
      prefs: {
        // we need to disable the keyboard to avoid intermittent failures on
        // Travis (transitions might take longer to run and block UI).
        'dom.mozInputMethod.enabled': false,
        // NOTE: We used to require 'focusmanager.testmode=true' for
        // B2G-Desktop, but Mulet and Device tests do not require it.
      }
    },
    desiredCapabilities: options && options.desiredCapabilities
  });

  this.stopwatch = new StopwatchActions(this._client);
  this.timer = new TimerActions(this._client);
  this.alarm = new AlarmActions(this._client, this);
}

module.exports = ClockAppActions;

ClockAppActions.prototype = {
  origin: 'app://clock.gaiamobile.org',

  launch: function(tab) {
    $.client = this._client;
    this._client.apps.launch(this.origin);
    this._client.apps.switchToApp(this.origin);
    this._client.helper.waitForElement('#clock-view .visible');

    if (tab && tab !== 'alarm') {
      this.openTab(tab);
    }

    // Wait until everything has loaded.
    this._client.waitFor(function() {
      return !!this.currentPanelId;
    }.bind(this));
  },

  restart: function(tab) {
    this._client.apps.close(this.origin);
    this.launch(tab);
  },

  get currentPanelId() {
    var activePanel = $('.panel.active');
    return activePanel && activePanel.data('panelId');
  },

  tapAndTransition: function(selector) {
    var previousPanel = this.currentPanelId;

    if (typeof selector === 'string') {
      selector = this._client.findElement(selector);
    }
    selector.tap();
    this._client.switchToShadowRoot();

    var self = this;
    this._client.waitFor(function() {
      var searchTimeout = self._client.searchTimeout;
      self._client.setSearchTimeout(0);

      var test = this.currentPanelId &&
        (previousPanel !== this.currentPanelId) &&
        !$('.slide-in-right, .slide-in-left')[0];
      self._client.setSearchTimeout(searchTimeout);
      return test;
    }.bind(this));
  },

  // Application Navigation

  openTab: function(tabName) {
    // Tap the button to open the tab
    this.tapAndTransition({
      alarm: '#alarm-tab',
      timer: '#timer-tab',
      stopwatch: '#stopwatch-tab'
    }[tabName]);

    $('[data-panel-id=' + tabName + ']')
      .waitToAppear();
  },


  isButtonUsable: function(btn) {
    return $(btn).attr('disabled') === 'false' && $(btn).displayed();
  }

};
