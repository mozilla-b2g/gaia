'use strict';

var utils = require('./utils');
var $ = require('./mquery');

function StopwatchActions(client) {
  this._client = client;
}

module.exports = StopwatchActions;

StopwatchActions.prototype = {
  get duration() {
    return utils.extractDuration($('.stopwatch-time').text());
  },

  get laps() {
    return this._client.executeScript(function() {
      var domItems = document.querySelectorAll('.lap-cell');
      var laps = [];
      for (var i = 0; i < domItems.length; i++) {
        var item = domItems[i];
        laps.push({
          name: item.querySelector('.lap-name').textContent,
          durationString: item.querySelector('.lap-duration').textContent
        });
      }
      return laps;
    }).map(function(lap) {
      lap.duration = utils.extractDuration(lap.durationString);
      return lap;
    });
  },

  start: function() {
    $('.stopwatch-start').tap();
    this.advanceTime();
    return this;
  },

  lap: function() {
    $('.stopwatch-lap').tap();
    this.advanceTime();
    return this;
  },

  pause: function() {
    $('.stopwatch-pause').tap();
    return this;
  },

  reset: function() {
    $('.stopwatch-reset').tap();
    return this;
  },

  setMaxLaps: function(num) {
    $('[data-panel-id="stopwatch"]').data('maxLaps', num);
    return this;
  },

  advanceTime: function(milliseconds) {
    milliseconds = milliseconds || 1;
    var expectedDuration = this.duration + milliseconds;
    this._client.waitFor(function() {
      return this.duration >= expectedDuration;
    }.bind(this));
    return this;
  }

};
