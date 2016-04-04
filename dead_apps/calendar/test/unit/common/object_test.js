define(function(require) {
'use strict';

var object = require('common/object');

suite('Object', function() {
  var subject;

  setup(function() {
    subject = object;
  });

  test('#filter', function() {
    assert.deepEqual(
      subject.filter(
        {
          '0': 'red',
          '1': 'orange',
          '2': 'yellow',
          '3': 'green',
          '4': 'blue',
          '5': 'violet'
        },
        (key, value) => {
          return value === 'red' || parseInt(key, 10) % 2 === 1;
        }
      ),
      [
        'red',
        'orange',
        'green',
        'violet'
      ]
    );
  });

  test('#forEach', function() {
    var input = { a: 'b', p: 'q', x: 'y' };
    var result = {};
    subject.forEach(input, (key, value) => {
      result[key] = value;
    });

    assert.deepEqual(input, result);
  });

  test('#map', function() {
    var input = { a: 'b', p: 'q', x: 'y' };
    var result = subject.map(input, (key, value) => {
      return value;
    });

    assert.deepEqual(result, ['b', 'q', 'y']);
  });

  test('#values', function() {
    var input = { a: 'b', p: 'q', x: 'y' };
    var result = subject.values(input);
    assert.deepEqual(result, ['b', 'q', 'y']);
  });
});

});
