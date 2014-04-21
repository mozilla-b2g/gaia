'use strict';

function vibratorTest() {
  var durationText = document.getElementById('duration-text');
  var duration = document.getElementById('duration');
  var timesText = document.getElementById('times-text');
  var times = document.getElementById('times');

  var clickHandlers = {
    'off': function() {
      window.navigator.vibrate(0);
    },
    'one-short': function() {
      window.navigator.vibrate(200);
    },
    'two-short': function() {
      window.navigator.vibrate([200, 100, 200, 100]);
    },
    'one-long': function() {
      window.navigator.vibrate(10000);
    },
    'custom-pattern': function() {
      var timesNum = parseInt(times.value);
      var pattern = [];
      for (var i = 0; i < timesNum * 2; i++) {
        pattern.push(parseInt(duration.value));
      }
      window.navigator.vibrate(pattern);
    }
  };

  // Update text when sliding bar is changed
  var changeHandlers = {
    'duration': function() {
      durationText.textContent = duration.value;
    },
    'times': function() {
      timesText.textContent = times.value;
    }
  };

  document.body.addEventListener('click', function(evt) {
    if (clickHandlers[evt.target.id]) {
      clickHandlers[evt.target.id].call(this, evt);
    }
  });
  document.body.addEventListener('input', function(evt) {
    if (changeHandlers[evt.target.id]) {
      changeHandlers[evt.target.id].call(this, evt);
    }
  });
}

window.addEventListener('load', vibratorTest);
