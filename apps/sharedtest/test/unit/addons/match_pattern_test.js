/*global MatchPattern */

'use strict';

require('/shared/js/addons/match_pattern.js');

suite('match pattern test > ', function() {

  var tests = {
    pass: [
      { url: 'http://mozilla.org', pattern: 'http://mozilla.org/' },
      { url: 'http://mozilla.org/', pattern: 'http://mozilla.org/' },
      { url: 'http://mozilla.org/', pattern: '*://mozilla.org/' },
      { url: 'https://mozilla.org/', pattern: '*://mozilla.org/' },
      { url: 'http://google.com', pattern: 'http://*.google.com/' },
      { url: 'http://docs.google.com', pattern: 'http://*.google.com/' },
      { url: 'http://mozilla.org:8080', pattern: 'http://mozilla.org/' },
      { url: 'http://mozilla.org:8080', pattern: '*://mozilla.org/' },
      { url: 'http://mozilla.org', pattern: 'http://mozilla.org/*' },
      { url: 'http://mozilla.org/', pattern: 'http://mozilla.org/*' },
      { url: 'http://mozilla.org/', pattern: '*://mozilla.org/*' },
      { url: 'https://mozilla.org/', pattern: '*://mozilla.org/*' },
      { url: 'http://google.com', pattern: 'http://*.google.com/*' },
      { url: 'http://docs.google.com', pattern: 'http://*.google.com/*' },
      { url: 'http://mozilla.com/abc/def', pattern: 'http://mozilla.com/*' },
      { url: 'http://mozilla.com/abc/def', pattern: 'http://mozilla.com/a*f' },
      { url: 'http://mozilla.com/abc/def', pattern: 'http://mozilla.com/a*' },
      { url: 'http://mozilla.com/abc/def', pattern: 'http://mozilla.com/*f' },
      { url: 'file:///foo', pattern: 'file:///foo*' },
      { url: 'file:///foo/bar.html', pattern: 'file:///foo*' },
      { url: 'http://mozilla.org/a', pattern: '<all_urls>' },
      { url: 'https://mozilla.org/a', pattern: '<all_urls>' },
      { url: 'ftp://mozilla.org/a', pattern: '<all_urls>' },
      { url: 'file:///a', pattern: '<all_urls>' },
      // Multiple patterns.
      { url: 'http://mozilla.org', pattern: ['http://mozilla.org/'] },
      { url: 'http://mozilla.org',
        pattern: ['http://mozilla.org/', 'http://mozilla.com/'] },
      { url: 'http://mozilla.com',
        pattern: ['http://mozilla.org/', 'http://mozilla.com/'] }
    ],
    fail: [
      // Invalid pattern.
      { url: 'http://mozilla.org', pattern: '' },
      // Pattern must include trailing slash.
      { url: 'http://mozilla.org', pattern: 'http://mozilla.org' },
      // Protocol not allowed.
      { url: 'http://mozilla.org', pattern: 'gopher://wuarchive.wustl.edu/' },
      { url: 'file://mozilla.org/', pattern: '*://mozilla.org/' },
      { url: 'ftp://mozilla.org/', pattern: '*://mozilla.org/' },
      { url: 'http://mozilla.com', pattern: 'http://*mozilla.com*/' },
      { url: 'http://mozilla.com', pattern: 'http://mozilla.*/' },
      { url: 'http://mozilla.com', pattern: 'http:/mozilla.com/' },
      { url: 'http://mozilla.org:8080', pattern: 'http://mozilla.org:8080/' },
      { url: 'file://mozilla.org/', pattern: '*://mozilla.org/*' },
      { url: 'http://mozilla.com', pattern: 'http://mozilla.*/*' },
      { url: 'http://mozilla.com/abc/def', pattern: 'http://mozilla.com/' },
      { url: 'http://mozilla.com/abc/def', pattern: 'http://mozilla.com/*e' },
      { url: 'http://mozilla.com/abc/def', pattern: 'http://mozilla.com/*c' },
      { url: 'http:///a.html', pattern: 'http:///a.html' },
      { url: 'gopher://wuarchive.wustl.edu/a', pattern: '<all_urls>' },
      { url: 'http://mozilla.biz',
        pattern: ['http://mozilla.org/', 'http://mozilla.com/'] }
    ]
  };

  function testMatchPattern({url, pattern}) {
    var urlToMatch = new URL(url);
    var matchPattern = new MatchPattern(pattern);
    return matchPattern.matches(urlToMatch);
  }

  test('passing URL patterns', function() {
    tests.pass.forEach(test => {
      assert.isTrue(testMatchPattern(test,
        `Expected match: ${JSON.stringify(test.pattern)}, ${test.url}`));
    });
  });

  test('failing URL patterns', function() {
    tests.fail.forEach(test => {
      assert.isFalse(testMatchPattern(test,
        `Expected no match: ${JSON.stringify(test.pattern)}, ${test.url}`));
    });
  });

});
