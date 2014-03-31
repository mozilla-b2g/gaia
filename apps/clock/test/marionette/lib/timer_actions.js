'use strict';

var utils = require('./utils');
var $ = require('./mquery');
var pickerUtils = require('./picker');

function TimerActions(client) {
  this._client = client;
}

module.exports = TimerActions;

TimerActions.prototype = {

  get hours() { return pickerUtils.getSpinnerValue('.picker-hours'); },
  get minutes() { return pickerUtils.getSpinnerValue('.picker-minutes'); },
  set hours(value) { pickerUtils.setSpinnerValue('.picker-hours', value); },
  set minutes(value) { pickerUtils.setSpinnerValue('.picker-minutes', value); },

  get countdown() {
    return utils.extractDuration($('#timer-time').text());
  },

  start: function() {
    $('#timer-create').tap();
    // Wait until the timer has moved from its default state of 0:00
    this._client.waitFor(function() {
      return this.countdown > 0;
    }.bind(this));
    return this;
  },

  pause: function() {
    $('#timer-pause').tap();
    return this;
  },

  resume: function() {
    $('#timer-start').tap();
    return this;
  },

  cancel: function() {
    $('#timer-cancel').tap();
    $('#timer-create').waitToAppear();
    return this;
  },

  advanceTime: function(milliseconds) {
    return this._client.helper.wait(milliseconds);
  }

};
