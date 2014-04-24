'use strict';

var $ = require('./mquery');
var Actions = require('marionette-client').Actions;

exports.getSpinnerValue = function(el) {
  el = $(el);
  var offsetTop = /translateY\(-?(\d+)/.exec(el.attr('style'))[1];
  var pickerItems = el.find('.picker-unit');
  var itemHeight = pickerItems[0].size().height;
  var index = Math.floor(parseInt(offsetTop, 10) / itemHeight);
  return parseInt(pickerItems[index].text(), 10);
};

exports.setSpinnerValue = function(el, value) {
  el = $(el);
  var itemHeight = $('.picker-unit').height();
  var currentValue = exports.getSpinnerValue(el);
  var targetValue = parseInt(value, 10);

  var actions = new Actions($.client);
  var magnitude = Math.abs(currentValue - targetValue) / 2;
  while (currentValue !== targetValue) {
    var dir = (currentValue < targetValue ? -1 : 1);
    actions
      .flick(el.parent(), 50, itemHeight / 2,
             50, itemHeight / 2 + dir * magnitude * itemHeight)
      .perform();
    exports.waitForSpinStop(el);
    currentValue = exports.getSpinnerValue(el);
    magnitude = Math.max(1, Math.abs(currentValue - targetValue) / 2);
  }
};

exports.waitForSpinStop = function(el) {
  var currentY, lastY;
  $.client.waitFor(function() {
    lastY = currentY;
    currentY = el.location().y;
    return currentY === lastY;
  }, { interval: 200 });
};
