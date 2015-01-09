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
      '?site:mozilla.org docshell',
      'http:',
      'app:',
      'rtsp:'
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
      'data:about',
      'rtsp://100.100.100.100/rtsp.mp4'
    ].forEach(function(input) {
      assert.ok(!UrlHelper.isNotURL(input));
    });
  });
});
