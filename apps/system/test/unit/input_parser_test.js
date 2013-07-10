'use strict';

mocha.globals(['InputParser']);

requireApp('system/js/value_selector/value_selector.js');
requireApp('system/js/value_selector/input_parser.js');

suite('value selector/input parser', function() {
  var inputParser;

  setup(function() {
    inputParser = ValueSelector.InputParser;
  });

  teardown(function() {
    inputParser = null;
  });

  test('#assign', function() {
    assert.ok(inputParser);
  });

  // localTime = date.toLocaleFormat('%H:%M');
  test('#importTime', function() {
    var time = inputParser.importTime('05:46');
    assert.equal(time.hours, 5);
    assert.equal(time.minutes, 46);
  });

  // localDate = date.toLocaleFormat('%Y-%m-%d');
  test('#formatInputDate', function() {
    var date = inputParser.formatInputDate('2013-05-21', '');
    assert.equal(date.getFullYear(), 2013);
    assert.equal(date.getMonth() + 1, 5);
    assert.equal(date.getDate(), 21);
  });
});
