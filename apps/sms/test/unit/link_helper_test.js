/*global LinkHelper, FixturePhones */

/*
  Link Helper Tests
*/
'use strict';

requireApp('sms/js/link_helper.js');

requireApp('sms/js/utils.js');
requireApp('sms/test/unit/mock_utils.js');

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
      test('Simple URL with IPv4 with zero', function() {
        testURLOK('http://8.0.8.8/');
      });
      test('<br>prefix', function() {
        testURLMatch('<br>mozilla.org', 'mozilla.org', true);
      });
      test('Trailing question mark', function() {
        testURLMatch('OMG mozilla.org? it is cool!', 'mozilla.org', true);
      });
      test('Trailing colon', function() {
        testURLMatch('OMG mozilla.org: it is cool!', 'mozilla.org', true);
      });
      test('Trailing semi-colon', function() {
        testURLMatch('OMG mozilla.org; it is cool!', 'mozilla.org', true);
      });
      test('Trailing bang', function() {
        testURLMatch('OMG mozilla.org! it is cool!', 'mozilla.org', true);
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
      test('Trailing question mark on path', function() {
        testURLMatch('OMG mzl.la/huh? it is cool!', 'mzl.la/huh', true);
      });
      test('Trailing colon on path', function() {
        testURLMatch('OMG mzl.la/huh: it is cool!', 'mzl.la/huh', true);
      });
      test('Trailing semi-colon on path', function() {
        testURLMatch('OMG mzl.la/huh; it is cool!', 'mzl.la/huh', true);
      });
      test('Trailing bang on path', function() {
        testURLMatch('OMG mzl.la/huh! it is cool!', 'mzl.la/huh', true);
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
      test('Bug 890342 1', function() {
        testURLNOK('2.74');
      });
      test('Bug 890342 2', function() {
        testURLNOK('21.72');
      });

      test('Bug 923739', function() {
        testURLNOK('foo.zz');
        testURLNOK('foo.foo');
        testURLNOK('foo.quux');

        testURLOK('http://whatever.stuff');
        testURLOK('https://whatever.stuff');
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

    function testPhoneMatch(text, match) {
      var expected = text.replace(match, phone2msg(match));
      var result = LinkHelper.searchAndLinkClickableData(text);
      assert.equal(result, expected);
    }

    function phone2msg(phone) {
      return '<a data-dial="' + phone + '"' +
             ' data-action="dial-link">' + phone + '</a>';
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

    suite('Matches', function() {
      test('Simple french mobile nat.', function() {
        testPhoneOK('0612345678');
      });

      test('Simple french mobile intl', function() {
        testPhoneOK('+33612345678');
      });

      test('Phone from #887737', function() {
        testPhoneOK('+5511 98907-6047');
      });

      test('word before trailing number', function() {
        testPhoneMatch('Test1 600123123', '600123123');
      });
      test('word after preceding number', function() {
        testPhoneMatch('600123123 1Test', '600123123');
      });
      [
        // Bug 900413 - detect 5 digit short codes
        '24242',
        '10086',
        '+1234'
      ].forEach(function(phone) {
        test(phone, testPhoneOK.bind(null, phone));
      });
    });

    suite('Failures', function() {
      [
        '0.34',
        '1200',
        '5000',
        '0.122',
        '0921',
        // Bug 900413 - 5 digit codes with separators not allowed
        '1-10-13',
        '12-3-13',
        '1-800-A',
        '1(234)5',
        '1234..5',
        '1 2 3 45',
        '1\t23\t45',
        '12+34'
      ].forEach(function(phone) {
         test(phone, testPhoneNOK.bind(null, phone));
      });
    });

    suite('Varied cases', function() {
      FixturePhones.forEach(function(fixture) {
        if (fixture.isTestable) {
          suite(fixture.title, function() {
            fixture.values.forEach(function(value) {
              test(value, function() {
                testPhoneOK(value);
              });
            });
          });
        }
      });
    });

    suite('Tricky Problems', function() {
      test('Two 9 digit numbers separated by space (#892480)', function() {
        var test = '123456789 987654321';
        var expected = test.split(' ').map(phone2msg).join(' ');
        var result = LinkHelper.searchAndLinkClickableData(test);
        assert.equal(result, expected);
      });
      test('Two 6 digit numbers separated by newline (#892480)', function() {
        var test = '222333\n333222';
        var expected = test.split('\n').map(phone2msg).join('\n');
        var result = LinkHelper.searchAndLinkClickableData(test);
        assert.equal(result, expected);
      });
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
        '<a data-dial="+18155551212" data-action="dial-link">' +
        '+18155551212</a> or (e-mail <a data-email="user@hostname.tld"' +
        ' data-action="email-link">user@hostname.tld</a>)';
      assert.equal(LinkHelper.searchAndLinkClickableData(test), expected);
    });
  });
});
