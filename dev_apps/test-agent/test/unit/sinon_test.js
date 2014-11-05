
/**
 * @fileoverview Test that a very vanilla mocha test
 * (taken liberally from sinon docs) passes.
 */
suite('sinon', function() {
  test('should be defined', function() {
    assert.notStrictEqual(this.sinon, undefined);
  });
});
