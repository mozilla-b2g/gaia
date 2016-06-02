'use strict';
/* global KeyEvent */

var $ = require('./mquery');

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
  var currentValue = exports.getSpinnerValue(el);
  var targetValue = parseInt(value, 10);
  var delta = targetValue - currentValue;

  el.parent().scriptWith(function(el, delta) {
    var count = Math.abs(delta);
    for (var i = 0; i < count; i++) {
      var evt = new CustomEvent('keypress');
      evt.keyCode = delta > 0 ? KeyEvent.DOM_VK_DOWN : KeyEvent.DOM_VK_UP;
      el.dispatchEvent(evt);
    }
  }, [delta]);

  exports.waitForSpinStop(el);
};

exports.waitForSpinStop = function(el) {
  var currentY, lastY;
  $.client.waitFor(function() {
    lastY = currentY;
    currentY = el.location().y;
    return currentY === lastY;
  }, { interval: 200 });
};
