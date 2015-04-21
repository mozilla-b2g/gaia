marionette('Endurance', function() {
  'use strict';

  var assert = require('assert');
  var actions = new (require('../lib/actions'))();

  setup(function() {
    actions.launch('alarm');
  });

  // PythonTests: endurance/test_endurance_set_alarm
  test('Set Alarm Endurance', function() {
    var totalIterations = 3;
    for (var iteration = 0; iteration < totalIterations; iteration++) {
      actions.alarm.create('Iteration ' + iteration, iteration + 10);
    }
    assert.equal(actions.alarm.list.length, totalIterations);
  });

});
