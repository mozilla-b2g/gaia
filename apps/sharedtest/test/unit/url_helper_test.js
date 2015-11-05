/* global UrlHelper */

require('/shared/js/url_helper.js');

suite('URL Helper', function() {
  'use strict';
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
      'http://',
      'data:',
      'view-source:',
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
      'view-source:http://foo.com/',
      'rtsp://100.100.100.100/rtsp.mp4'
    ].forEach(function(input) {
      assert.ok(!UrlHelper.isNotURL(input));
    });
  });

  test('resolveUrl', function() {
    var result = UrlHelper.resolveUrl('/bar', 'http://foo.com/');
    assert.equal(result, 'http://foo.com/bar');
  });

  test('getHostname', function() {
    var result = UrlHelper.getHostname('http://example.com');
    assert.equal(result, 'example.com');
  });
});
