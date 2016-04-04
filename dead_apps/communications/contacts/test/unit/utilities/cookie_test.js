'use strict';

requireApp('communications/contacts/js/utilities/cookie.js');

suite('Contacts Cookies', function() {
  var COOKIE_NAME = 'preferences';
  var COOKIE_PROPS = null;
  var subject = null;

  suiteSetup(function() {
    COOKIE_PROPS = Object.keys(window.utils.cookie.COOKIE_DEFAULTS);
    subject = window.utils.cookie;
  });

  function deleteCookie() {
    document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  function saveCookie(value) {
    document.cookie = COOKIE_NAME + '= ' + value;
  }

  function checkDefaultCookie(cookie) {
    assert.equal(cookie.version, subject.COOKIE_VERSION);
    COOKIE_PROPS.forEach(function(prop) {
      assert.equal(cookie[prop], subject.getDefault(prop));
    });
  }

  setup(function() {
    deleteCookie();
  });

  suite('Bad cookie', function() {
    test('No cookie returns null;', function() {
      var cookie = subject.load();

      assert.isNull(cookie);
    });

    test('Invalid cookie should return default cookie value', function() {
      saveCookie('invalid value');

      var cookie = subject.load();
      assert.isNotNull(cookie);
      checkDefaultCookie(cookie);
    });
  });

  suite('Update cookie', function() {
    test('Updating empty cookie with invalid property', function() {
      subject.update({test: 1});
      var cookie = subject.load();
      assert.isNotNull(cookie);
      assert.equal(cookie.version, subject.COOKIE_VERSION);
      assert.equal(cookie.test, null);
    });

    test('Updating empty cookie', function() {
      subject.update({order: true});
      var cookie = subject.load();
      assert.isNotNull(cookie);
      assert.equal(cookie.version, subject.COOKIE_VERSION);
      assert.isTrue(cookie.order);
    });

    test('Update invalid cookie', function() {
      saveCookie('invalid value');
      subject.update({order: true});
      var cookie = subject.load();
      assert.isNotNull(cookie);
      assert.equal(cookie.version, subject.COOKIE_VERSION);
      assert.isTrue(cookie.order);
    });
  });
});