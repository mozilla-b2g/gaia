'use strict';

var utils = require('./utils');
var $ = require('./mquery');
var pickerUtils = require('./picker');

function TimerActions(client, actions) {
  this._client = client;
  this.actions = actions;
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

  get sound() {
    return $('#timer-sound').val();
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
  },

  fire: function(attentionHandler, testOpts) {
    testOpts = testOpts || {};
    this._client.executeScript(function(testOpts) {
      testOpts = JSON.parse(testOpts);
      setTimeout(function() {
        window.dispatchEvent(new CustomEvent('test-alarm', {
          detail: {
            type: 'timer',
            testOpts: testOpts
          }
        }));
      }, testOpts.delay || 0);
    }, [JSON.stringify(testOpts)]);

    if (attentionHandler) {
      this.actions.withAttentionFrame(attentionHandler);
    }
  }

};
