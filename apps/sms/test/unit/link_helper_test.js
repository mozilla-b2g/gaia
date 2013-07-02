/*
  Link Helper Tests
*/
'use strict';

requireApp('sms/js/link_helper.js');

suite('link_helper_test.js', function() {

  suite('LinkHelper URL replacements', function() {

    function url2msg(url, addprefix) {
      var link = url;

      if (addprefix) {
        url = 'http://' + url;
      }

      return '<a data-url="' + url + '"' +
             ' data-action="url-link" >' + link + '</a>';
    }

    function testURLMatch(url, match, addprefix) {
      var expected = url.replace(match, url2msg(match, addprefix));
      var result = LinkHelper.searchAndLinkClickableData(url);
      assert.equal(result, expected);
    }

    function testURLOK(url, addprefix) {
      var expected = url2msg(url, addprefix);
      var result = LinkHelper.searchAndLinkClickableData(url);
      assert.equal(result, expected);
    }

    function testURLNOK(url) {
      // we only test url here to make sure it doesn't match
      var result = LinkHelper.searchAndLinkUrl(url);
      assert.equal(result, url);
    }

    suite('Matches', function() {
      test('Simple URL', function() {
        testURLOK('http://www.mozilla.org/');
      });
      test('Simple URL .co.uk', function() {
        testURLOK('http://www.mozilla.co.uk/');
      });
      test('Simple short URL', function() {
        testURLOK('mzl.la', true);
      });
      test('Simple short URL with parens', function() {
        testURLMatch('(mzl.la)', 'mzl.la', true);
      });
      test('Simple short URL with trailing dot', function() {
        testURLMatch('mzl.la.', 'mzl.la', true);
      });
      test('Simple short URL with trailing dot and port', function() {
        testURLMatch('mzl.la.:527', 'mzl.la', true);
      });
      test('Simple short URL with value', function() {
        testURLOK('mzl.la/ac', true);
      });
      test('Simple URL https', function() {
        testURLOK('https://www.mozilla.org');
      });
      test('Simple URL https without www.', function() {
        testURLOK('https://mozilla.org');
      });
      test('Simple URL https with trailing dot on domain.', function() {
        testURLOK('https://mozilla.org./blah');
      });
      test('Simple URL http with port', function() {
        testURLOK('http://www.mozilla.org:8080/');
      });
      test('Simple URL http without www. and with port', function() {
        testURLOK('http://mozilla.org:8080/');
      });
      test('Simple URL with IPv4', function() {
        testURLOK('http://8.8.8.8/');
      });
      test('Trailing period', function() {
        testURLMatch('Check out mozilla.org.', 'mozilla.org', true);
      });
      test('Trailing comma', function() {
        testURLMatch('Check out mozilla.org, or not', 'mozilla.org', true);
      });
      test('Trailing parens', function() {
        testURLMatch('(Check out mozilla.org)', 'mozilla.org', true);
      });
      test('Trailing parens on path', function() {
        testURLMatch('(Check out mzl.la/ac)', 'mzl.la/ac', true);
      });
      test('Trailing period on path', function() {
        testURLMatch('Check out mzl.la/ac.', 'mzl.la/ac', true);
      });
      test('Trailing comma on path', function() {
        testURLMatch('Check out mzl.la/ac, or not', 'mzl.la/ac', true);
      });
      test('wiki link that has paren', function() {
        testURLOK('http://en.wikipedia.org/wiki/Arete_(disambiguation)');
      });
      test('Crazy URL from #887146', function() {
        testURLOK('http://sani.tiz.ed.com/wap/videos/files_mm/' +
          '3GPP%20MPEG4%20-%20176×144_7fps_15kpbs_AACmono_8KHz_5kbps.3gp');
      });
      test('One letter second-level', function() {
        testURLOK('http://x.com');
      });
      test('URL with phone number in the middle', function() {
        testURLOK('http://somesite.com/q,12288296666/');
      });
    });

    suite('Failures', function() {
      test('Simple invalid URL', function() {
        testURLNOK('htt://www.mozilla.org');
      });
      test('Simple invalid URL with slashes', function() {
        testURLNOK('http://www.a/b/d.com');
      });
      test('Simple invalid TLD URL', function() {
        testURLNOK('http://www.mozilla.o');
      });
      test('Simple ellipse', function() {
        testURLNOK('aaa...ccc');
      });
      test('Simple URL with username', function() {
        testURLNOK('http://user@mozilla.org');
      });
      test('Simple URL with credentials', function() {
        testURLNOK('http://user:pass@mozilla.org');
      });
      test('Simple URL with IPv6', function() {
        testURLNOK('http://[::1]/');
      });
    });
  });

  suite('LinkHelper Email replacements', function() {

    function email2msg(email) {
      return '<a data-email="' + email + '"' +
             ' data-action="email-link">' + email + '</a>';
    }

    function testEmailOK(email) {
      var exp = email2msg(email);
      var res = LinkHelper.searchAndLinkClickableData(email);
      assert.equal(res, exp);
    }

    function testEmailNOK(email) {
      var res = LinkHelper.searchAndLinkEmail(email);
      assert.equal(res, email);
    }

    test('Simple email', function() {
      testEmailOK('user@hostname.tld');
    });
    test('Simple email with alias', function() {
      testEmailOK('user+alias@hostname.tld');
    });
    test('Simple email with subdomain', function() {
      testEmailOK('user@cs.subdhostname.tld');
    });
    test('Invalid email no hostname', function() {
      testEmailNOK('user@');
    });
    test('Invalid email no user', function() {
      testEmailNOK('@hostname.tld');
    });
  });

  suite('LinkHelper Phone replacements', function() {

    function phone2msg(phone) {
      return '<a data-phonenumber="' + phone + '"' +
             ' data-action="phone-link">' + phone + '</a>';
    }

    function testPhoneOK(phone) {
      var exp = phone2msg(phone);
      var res = LinkHelper.searchAndLinkClickableData(phone);
      assert.equal(res, exp);
    }

    function testPhoneNOK(phone) {
      var res = LinkHelper.searchAndLinkPhone(phone);
      assert.equal(res, phone);
    }

    test('Simple french mobile nat.', function() {
      testPhoneOK('0612345678');
    });

    test('Simple french mobile intl', function() {
      testPhoneOK('+33612345678');
    });

  });

  suite('Multiple in the same string', function() {
    test('Hits every case', function() {
      var test = 'Hey, check out http://stackoverflow.com/q/12882966/ and ' +
        'call me at +18155551212 or (e-mail user@hostname.tld)';
      var expected = 'Hey, check out ' +
        '<a data-url="http://stackoverflow.com/q/12882966/" ' +
        'data-action="url-link" >http://stackoverflow.com/q/12882966/</a>' +
        ' and call me at ' +
        '<a data-phonenumber="+18155551212" data-action="phone-link">' +
        '+18155551212</a> or (e-mail <a data-email="user@hostname.tld"' +
        ' data-action="email-link">user@hostname.tld</a>)';
      assert.equal(LinkHelper.searchAndLinkClickableData(test), expected);
    });
  });
});
