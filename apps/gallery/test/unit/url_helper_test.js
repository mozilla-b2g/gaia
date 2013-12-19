/**
 * Tests for the shared url helpercode
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/url_helper.js');

suite('URL Helper', function() {
  test('isNotURL => true', function() {
    [
      'data',
      'a ? b',
      'a . b ?',
      'what is mozilla',
      'what is mozilla?',
      'www.blah.com foo',
      'a?some b',
      'docshell site:mozilla.org',
      '?mozilla',
      '?site:mozilla.org docshell'
    ].forEach(function(input) {
      assert.ok(UrlHelper.isNotURL(input));
    });
  });

  test('isNotURL => false', function() {
    [
      'http://foo',
      'blerg.co.uk',
      'blach.com',
      'www.blah.com',
      'a:80',
      'a?',
      'a?b',
      'http://foo.com',
      'data:about'
    ].forEach(function(input) {
      assert.ok(!UrlHelper.isNotURL(input));
    });
  });
});
