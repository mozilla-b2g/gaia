'use strict'
var durationDisplay = document.getElementById('duration-display');
var timesDisplay = document.getElementById('times-display');

var clickHandlers = {
  'off': function () {
    window.navigator.vibrate(0);
  },
  'one-short': function () {
    window.navigator.vibrate(200);
  },
  'two-short': function () {
    window.navigator.vibrate([200,100,200]);
  },
  'one-long': function () {
    window.navigator.vibrate(10000);
  },
  'custom-pattern': function () {
    var timesNum = parseInt(times.value);
    var pattern = [];
    for(var i = 0; i < timesNum*2; i++)
    {
	pattern.push(parseInt(duration.value));
    }
    window.navigator.vibrate(pattern);
  },
  'duration': function () {
    durationDisplay.innerHTML = duration.value;
  },
  'times': function () {
    timesDisplay.innerHTML = times.value;
  }
};

document.body.addEventListener('click', function (evt) {
  if (clickHandlers[evt.target.id])
    clickHandlers[evt.target.id].call(this, evt);
});
