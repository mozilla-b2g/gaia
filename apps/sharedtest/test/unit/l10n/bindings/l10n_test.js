'use strict';

var strings = {
 'lang1': [
    'cropimage                 = Crop',
    'cropimage2                = Crop2',
    'input.placeholder         = Placeholder',
    'input2.placeholder        = Placeholder 2',
    'header1                   = Header 1',
    'header11                  = Header 1.1',
    'header2                   = Header 2',
    'header2.title             = Header 2 Title',
    'unreadEmails              = You have {{ emails }} unread emails',
    'bad.title                 = alert(1)',
    'bad.onclick               = alert(1)',
  ],
 'lang2': [
    'cropimage                 = Crop Lang2',
    'cropimage2                = Crop2 Lang2',
    'input                     = Foo Lang2',
    'input.placeholder         = Placeholder Lang2',
    'header1                   = Header 1 Lang2',
    'header11                  = Header 1.1 Lang2',
    'header2                   = Header 2 Lang2',
    'header2.title             = Header 2 Title Lang2',
  ]
};

suite('L10n bindings', function() {
  var xhr;
  var lang;

  // Do not begin tests until the test locale has been loaded.
  suiteSetup(function(done) {
    xhr = sinon.useFakeXMLHttpRequest();

    xhr.onCreate = function(request) {
      setTimeout(function() {
        request.respond(200, {}, strings[lang].join('\n'));
      }, 0);
    };

    // en-US has already been loaded in setup.js and l10n.js is smart enough
    // not to re-fetch resources;  hence, set the lang to something new
    lang = 'lang1';

    navigator.mozL10n.ctx.registerLocales('en-US', ['lang1', 'lang2']);

    navigator.mozL10n.language.code = lang;
    navigator.mozL10n.once(done);
  });

  suiteTeardown(function() {
    xhr.restore();
  });

  suite('mutations', function() {
    suite('element', function() {
      var elem;

      suiteSetup(function() {
        elem = document.createElement('div');
        elem.setAttribute('data-l10n-id', 'cropimage');
      });

      suiteTeardown(function() {
        document.body.removeChild(elem);
      });

      test('insert', function(done) {
        document.body.appendChild(elem);
        setTimeout(function() {
          assert.equal(elem.textContent, 'Crop');
          done();
        });
      });

      test('change l10n-id', function(done) {
        elem.setAttribute('data-l10n-id', 'cropimage2');
        setTimeout(function() {
          assert.equal(elem.textContent, 'Crop2');
          done();
        });
      });

      test('remove l10n-id', function(done) {
        elem.removeAttribute('data-l10n-id');
        setTimeout(function() {
          assert.equal(elem.textContent, 'Crop2');
          done();
        });
      });
    });

    suite('attribute', function() {
      var elem;

      suiteSetup(function() {
        elem = document.createElement('input');
        elem.setAttribute('data-l10n-id', 'input');
      });

      suiteTeardown(function() {
        document.body.removeChild(elem);
      });

      test('insert', function(done) {
        document.body.appendChild(elem);
        setTimeout(function() {
          assert.equal(elem.getAttribute('placeholder'), 'Placeholder');
          done();
        });
      });

      test('change l10n-id', function(done) {
        elem.setAttribute('data-l10n-id', 'input2');
        setTimeout(function() {
          assert.equal(elem.getAttribute('placeholder'), 'Placeholder 2');
          done();
        });
      });

      test('remove l10n-id', function(done) {
        elem.removeAttribute('data-l10n-id');
        setTimeout(function() {
          assert.equal(elem.getAttribute('placeholder'), 'Placeholder 2');
          done();
        });
      });
    });

    suite('l10n args', function() {
      var elem;

      suiteSetup(function() {
        elem = document.createElement('div');
        elem.setAttribute('data-l10n-args', JSON.stringify({
          emails: 5
        }));
        elem.setAttribute('data-l10n-id', 'unreadEmails');
      });

      suiteTeardown(function() {
        document.body.removeChild(elem);
      });

      test('insert', function(done) {
        document.body.appendChild(elem);
        setTimeout(function() {
          assert.equal(elem.textContent, 'You have 5 unread emails');
          done();
        });
      });

      test('change l10n-args', function(done) {
        elem.setAttribute('data-l10n-args', JSON.stringify({
          emails: 6
        }));
        setTimeout(function() {
          assert.equal(elem.textContent, 'You have 6 unread emails');
          done();
        });
      });
    });

    suite('DOMFragment', function() {
      var frag, h1, h2;

      suiteSetup(function() {
        frag = document.createElement('div');
        h1 = document.createElement('h1');
        h2 = document.createElement('h2');
        h1.setAttribute('data-l10n-id', 'header1');
        h2.setAttribute('data-l10n-id', 'header2');
        frag.appendChild(h1);
        frag.appendChild(h2);
      });

      suiteTeardown(function() {
        document.body.removeChild(frag);
      });

      test('insert', function(done) {
        document.body.appendChild(frag);
        setTimeout(function() {
          assert.equal(h1.textContent, 'Header 1');
          assert.equal(h2.textContent, 'Header 2');
          assert.equal(h2.title, 'Header 2 Title');
          done();
        });
      });

      test('change l10n-id', function(done) {
        h1.setAttribute('data-l10n-id', 'header11');
        setTimeout(function() {
          assert.equal(h1.textContent, 'Header 1.1');
          done();
        });
      });

      test('remove l10n-id', function(done) {
        h2.removeAttribute('data-l10n-id');
        setTimeout(function() {
          assert.equal(h2.textContent, 'Header 2');
          done();
        });
      });
    });

    suite('Language change', function() {
      var elem, frag, h1, h2;

      suiteSetup(function() {
        lang = 'lang2';
        elem = document.createElement('div');
        frag = document.createElement('div');
        h1 = document.createElement('h1');
        h2 = document.createElement('h2');
        elem.setAttribute('data-l10n-id', 'cropimage');
        h1.setAttribute('data-l10n-id', 'header1');
        h2.setAttribute('data-l10n-id', 'header2');
        frag.appendChild(h1);
        frag.appendChild(h2);
        document.body.appendChild(elem);
        document.body.appendChild(frag);
      });

      suiteTeardown(function(done) {
        document.body.removeChild(frag);
        lang = 'lang1';
        navigator.mozL10n.ctx.addEventListener('ready', function onReady() {
          navigator.mozL10n.ctx.removeEventListener('ready', onReady);
          done();
        });
        navigator.mozL10n.ctx.requestLocales(lang);
      });

      test('retranslation', function(done) {
        navigator.mozL10n.ctx.addEventListener('ready', function onReady() {
          navigator.mozL10n.ctx.removeEventListener('ready', onReady);
          setTimeout(function() {
            assert.equal(elem.textContent, 'Crop Lang2');
            assert.equal(h1.textContent, 'Header 1 Lang2');
            assert.equal(h2.textContent, 'Header 2 Lang2');
            assert.equal(h2.title, 'Header 2 Title Lang2');
            done();
          });
        });

        navigator.mozL10n.ctx.requestLocales(lang);
      });
    });
  });

  suite('whitelisting', function() {
    test('does not allow attributes not on the whitelist', function() {
      var elem = document.createElement('div');
      elem.setAttribute('data-l10n-id', 'bad');
      navigator.mozL10n.translateFragment(elem);
      assert.equal(elem.getAttribute('title'), 'alert(1)');
      assert.equal(elem.getAttribute('onclick'), undefined);
    });
  });

});
