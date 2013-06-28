/*
  Link Helper Tests
*/
'use strict';

mocha.globals(['0', '6']);

requireApp('sms/js/link_helper.js');

suite('link_helper_test.js', function() {
  suiteSetup(function() {
  });
  suiteTeardown(function() {
  });

  suite('LinkHelper URL replacements', function() {

    function url2msg(url, addprefix) {
      var link = url;

      if (addprefix) {
        url = 'http://' + url;
      }

      return '<a data-url="' + url + '"' +
             ' data-action="url-link" >' + link + '</a>';
    }

    function testURLOK(url, addprefix = false) {
      var exp = url2msg(url, addprefix);
      var res = LinkHelper.searchAndLinkUrl(url);
      assert.equal(res, exp);
    }

    function testURLNOK(url) {
      var res = LinkHelper.searchAndLinkUrl(url);
      assert.equal(res, url);
    }

    test('Simple URL', function() {
      testURLOK('http://www.mozilla.org/');
    });
    test('Simple URL .co.uk', function() {
      testURLOK('http://www.mozilla.co.uk/');
    });
    test('Simple short URL', function() {
      testURLOK('mzl.la', true);
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
    test('Simple URL http with port', function() {
      testURLOK('http://www.mozilla.org:8080/');
    });
    test('Simple URL http without www. and with port', function() {
      testURLOK('http://mozilla.org:8080/');
    });
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
    test('Simple URL with IPv4', function() {
      testURLNOK('http://1.2.3.4/');
    });
    test('Simple URL with IPv6', function() {
      testURLNOK('http://[::1]/');
    });
  });

  suite('LinkHelper Email replacements', function() {

    function email2msg(email) {
      return '<a data-email="' + email + '"' +
             ' data-action="email-link">' + email + '</a>';
    }

    function testEmailOK(email) {
      var exp = email2msg(email);
      var res = LinkHelper.searchAndLinkEmail(email);
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
      var res = LinkHelper.searchAndLinkPhone(phone);
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
});
