/* global assert */
'use strict';
suite('padZeros', function() {
  var padZeros = require('../../../../lib/utils/padzeros');

  test('one digit', function() {
    assert.equal(padZeros(2), '02');
  });

  test('two digits', function() {
    assert.equal(padZeros(23), '23');
  });

  test('three digits', function() {
    assert.equal(padZeros(777), '777');
  });
});
