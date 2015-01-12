/* global Format */

require('/shared/js/format.js');

suite('format', function() {
  'use strict';

  // Result, input, len, padWith
  var testCases = [
    ['1', 1, 1, ''],
    ['001', 1, 3, '0'],
    ['  1', 1, 3, undefined],
    ['0001', '0001', 2, '0']
  ];

  test('padLeft', function() {
    testCases.forEach(function(testCase) {
      var result = testCase.shift();
      assert.equal(result, Format.padLeft.apply(Format, testCase));
    });
  });
});
