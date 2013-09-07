suite('shared: requireFromApp', function() {
  var subject = require('gaia-marionette'),
      fsPath = require('path'),
      assert = require('assert');

  test('load item from calendar app', function() {
    // yeah nobody should do this in a test
    var realPath = fsPath.resolve(
      __dirname, '..', '..', '..', '..',
      'apps', 'calendar', 'test', 'marionette', 'calendar.js'
    );

    assert.equal(
      subject.requireFromApp('calendar', 'calendar'),
      require(realPath)
    );
  });
});
