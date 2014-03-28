/* global marionette */
'use strict';

var $ = require('./mquery');
var StopwatchActions = require('./stopwatch_actions');
var TimerActions = require('./timer_actions');
var AlarmActions = require('./alarm_actions');

function ClockAppActions() {
  this._client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    }
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

  get currentPanelId() {
    var activePanel = $('.panel.active');
    return activePanel && activePanel.data('panelId');
  },

  tapAndTransition: function(selector) {
    var previousPanel = this.currentPanelId;

    $(selector).tap();

    this._client.waitFor(function() {
      return this.currentPanelId && (previousPanel !== this.currentPanelId) &&
        !$('.slide-in-right, .slide-in-left')[0];
    }.bind(this));
  },

  // Application Navigation

  openTab: function(tabName) {
    // Tap the button to open the tab
    this.tapAndTransition({
      alarm: '#alarm-tab a',
      timer: '#timer-tab a',
      stopwatch: '#stopwatch-tab a'
    }[tabName]);

    $('[data-panel-id=' + tabName + ']')
      .waitToAppear();
  },


  isButtonUsable: function(btn) {
    return $(btn).attr('disabled') === 'false' && $(btn).displayed();
  }

};

