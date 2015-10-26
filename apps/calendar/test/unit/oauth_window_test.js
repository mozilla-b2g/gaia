define(function(require) {
'use strict';

var OAuthWindow = require('oauth_window');
var QueryString = require('querystring');
var View = require('view');

suite('OAuthWindow', function() {
  var subject;
  var url = 'https://foobar.com';
  var element;
  var params = {
    client_id: 'foo',
    redirect_uri: 'http://oauth.gaiamobile.org/foobar'
  };

  function emitLocationChange(url) {
    var event = new CustomEvent('mozbrowserlocationchange', {
      detail: url
    });

    subject.browserFrame.dispatchEvent(event);
  }

  setup(function() {
    element = document.createElement('section');
    element.innerHTML = [
      '<section role="region">',
        '<gaia-header ignore-dir id="oauth-header" action="cancel">',
          '<h1 class="oauth-browser-title"></h1>',
        '</gaia-header>',
        '<div class="browser-container"></div>',
      '</section>'
    ].join('');

    subject = new OAuthWindow(
      element,
      url,
      params
    );
  });

  test('initialization', function() {
    assert.deepEqual(subject.params, params);
    assert.equal(subject.element, element);
    assert.deepEqual(
      subject.target,
      url + '?' + QueryString.stringify(params),
      '.target'
    );
  });

  test('.browserContainer', function() {
    assert.ok(subject.browserContainer, 'has container');
    assert.equal(subject.browserContainer, element.querySelector(
      subject.selectors.browserContainer
    ));
  });

  test('.browserTitle', function() {
    assert.equal(
      subject.browserTitle,
      element.querySelector(subject.selectors.browserTitle)
    );
  });

  test('.browserHeader', function() {
    assert.equal(
      subject.browserHeader,
      element.querySelector(subject.selectors.browserHeader)
    );
  });

  test('without redirect_uri', function() {
    assert.throws(function() {
      return new OAuthWindow(url, {});
    });
  });

  suite('#open', function() {
    setup(function() {
      subject.open();
    });

    test('.isOpen', function() {
      assert.isTrue(subject.isOpen);
    });

    test('is active', function() {
      assert.ok(
        subject.element.classList.contains(View.ACTIVE),
        'is active'
      );
    });

    test('has iframe', function() {
      var iframe = element.querySelector(
        'iframe'
      );

      assert.ok(
        iframe.getAttribute('mozbrowser'),
        'is mozbrowser'
      );

      assert.equal(
        iframe.getAttribute('src'),
        subject.target,
        'is at url'
      );

      assert.equal(subject.browserFrame, iframe);
      assert.equal(
        subject.browserContainer.firstElementChild,
        subject.browserFrame,
        'is inside container'
      );
    });

    test('url changed to something other then redirect_uri', function() {
      var newUrl = 'http://foobar.com/bar/bar';
      emitLocationChange(newUrl);

      assert.equal(
        subject.browserTitle.textContent,
        newUrl,
        'changes url'
      );
    });

    test('click cancel button', function(done) {
      var hasClosed;
      subject.onabort = function() {
        assert.ok(hasClosed, 'called close');
        done();
      };

      subject.close = function() {
        hasClosed = true;
      };

      testSupport.calendar.triggerEvent(
        subject.browserHeader,
        'action'
      );
    });

    test('redirects to redirect_uri', function(done) {
      var successParams = {
        code: 'wow',
        state: 'youwin'
      };

      var hasClosed;
      subject.close = function() {
        hasClosed = true;
      };

      subject.oncomplete = function(params) {
        assert.ok(hasClosed, 'closed window');
        assert.deepEqual(successParams, params, 'parsed params');
        done();
      };

      emitLocationChange(
        params.redirect_uri + '?' +
        QueryString.stringify(successParams)
      );
    });
  });

  suite('#close', function() {
    setup(function() {
      subject.open();
    });

    test('removes iframe', function() {
      assert.ok(subject.browserFrame, 'has frame');

      subject.close();
      assert.ok(!subject.browserFrame, 'removes frame');
      assert.ok(!element.querySelector('iframe'), 'removes from dom');
      assert.isFalse(subject.isOpen, 'isOpen');
      assert.ok(
        !element.classList.contains(View.ACTIVE),
        'is inactive'
      );
    });

    test('cleans up events', function() {
      var triggedClose;
      subject.close();
      subject.close();

      subject.close = function() {
        triggedClose = true;
      };

      testSupport.calendar.triggerEvent(
        subject.browserHeader,
        'action'
      );

      assert.ok(!triggedClose, 'does not trigger close');
    });
  });
});

});
