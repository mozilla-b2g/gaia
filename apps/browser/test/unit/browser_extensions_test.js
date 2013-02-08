requireApp('browser/js/browser_extensions.js');

suite('Browser', function() {
  test('isNotURL => true', function() {
    [
      'data',
      'a ? b',
      'a . b ?',
      'what is mozilla',
      'what is mozilla?',
      'docshell site:mozilla.org',
      '?mozilla',
      '?site:mozilla.org docshell'
    ].forEach(function(input) {
      assert.ok(Browser.isNotURL(input));
    });
  });

  test('isNotURL => false', function() {
    [
      'blerg.co.uk',
      'blach.com',
      'www.blah.com',
      'www.blah.com foo',
      'a:80',
      'a?',
      'a?b',
      'a?some b',
      'data:foo',
      'http://foo.com'
    ].forEach(function(input) {
      assert.ok(!Browser.isNotURL(input));
    });
  });
});
