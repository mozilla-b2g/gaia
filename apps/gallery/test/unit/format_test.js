/**
 * Tests for the shared formatters
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/format.js');

suite('format', function() {

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
