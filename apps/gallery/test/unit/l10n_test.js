/**
 * Tests for the shared l10n date code
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */

suite('L10n', function() {
  var _;
  var _translate;
  var _localize;

  var l10props = [
    'cropimage                 = Crop',
    'delete-n-items            = {[ plural(n) ]}',
    'delete-n-items[zero]      = Nothing selected',
    'delete-n-items[one]       = Delete selected item?',
    'delete-n-items[other]     = Delete {{ n }} items?',
    'textcontent-test          = this is text content',
    'prop-test.prop            = this is a property',
    'dot.prop-test.prop        = this is another property',
    'dataset-test.dataset.prop = this is a data attribute',
    'style-test.style.padding  = 10px',
    'euroSign                  = price: 10\\u20ac to 20\\u20ac',
    'leadingSpaces             = \\u0020\\u020\\u20%2F',
    'trailingBackslash         = backslash\\\\',
    'multiLine                 = foo \\',
    '                            bar \\',
    '                            baz',
    'update.innerHTML          = {[ plural(n) ]}',
    'update.innerHTML[zero]    = <strong>No updates.</strong>',
    'update.innerHTML[one]     = <strong>{{n}} update available.</strong> \\',
    '                            <span>Tap for more info.</span>',
    'update.innerHTML[other]   = <strong>{{n}} updates available.</strong> \\',
    '                            <span>Tap for more info.</span>',
    'inline-translation-test   = static content provided by inlined JSON',
    'a11y-label.ariaLabel      = label via ARIA'
  ].join('\n');

  var key_cropImage = 'cropimage';
  var key_delete = 'delete-n-items';
  var key_euroSign = 'euroSign';
  var key_leadingSpaces = 'leadingSpaces';
  var key_multiLine = 'multiLine';
  var key_backslash = 'trailingBackslash';

  var xhr;

  // Do not begin tests until the test locale has been loaded.
  suiteSetup(function(done) {
    xhr = sinon.useFakeXMLHttpRequest();

    xhr.onCreate = function(request) {
      setTimeout(function() {
        request.respond(200, {}, l10props);
      }, 0);
    };

    _ = navigator.mozL10n.get;
    _translate = navigator.mozL10n.translate;
    _localize = navigator.mozL10n.localize;

    // We need to set a different locale here than en-US, because en-US being
    // the default has already been loaded and prepared by setup.js.  L20n
    // won't re-download the resources if we try to set the language to en-US
    // again here.
    var lang = 'fr';

    navigator.mozL10n.language.code = lang;
    navigator.mozL10n.ready(function suiteSetup_ready() {
      // Make sure to remove this event listener in case we re-translate
      // below.
      window.removeEventListener('localized', suiteSetup_ready);
      done();
    });
  });

  suiteTeardown(function() {
    xhr.restore();
  });

  suite('get', function() {
    test('existing key', function() {
      assert.strictEqual(_(key_cropImage), 'Crop');
    });

    test('inexisting key', function() {
      assert.strictEqual(_('bla'), '');
    });

    suite('plural', function() {
      test('n=0', function() {
        assert.strictEqual(_(key_delete, { n: 0 }), 'Nothing selected');
      });

      test('n=1', function() {
        assert.strictEqual(_(key_delete, { n: 1 }), 'Delete selected item?');
      });

      test('n=2', function() {
        assert.strictEqual(_(key_delete, { n: 2 }), 'Delete 2 items?');
      });
    });

    test('unescape utf8 char codes', function() {
      assert.strictEqual(_(key_euroSign), 'price: 10€ to 20€');
      assert.strictEqual(_(key_leadingSpaces), '   %2F');
    });

    test('multiline string', function() {
      assert.strictEqual(_(key_multiLine), 'foo bar baz');
    });

    test('escaped trailing backslash', function() {
      assert.strictEqual(_(key_backslash), 'backslash\\');
    });
  });

  suite('translate', function() {
    var elem;
    setup(function() {
      elem = document.createElement('div');
    });

    test('text content', function() {
      elem.dataset.l10nId = 'textcontent-test';
      _translate(elem);
      assert.equal(elem.textContent, 'this is text content');
    });

    test('properties', function() {
      elem.dataset.l10nId = 'prop-test';
      _translate(elem);
      assert.equal(elem.prop, 'this is a property');
    });

    test('properties using final period', function() {
      elem.dataset.l10nId = 'dot.prop-test';
      _translate(elem);
      assert.equal(elem.prop, 'this is another property');
    });

    test('data-* attributes', function() {
      elem.dataset.l10nId = 'dataset-test';
      _translate(elem);
      assert.equal(elem.dataset.prop, 'this is a data attribute');
    });

    test('style attributes', function() {
      elem.dataset.l10nId = 'style-test';
      _translate(elem);
      assert.equal(elem.style.padding, '10px');
    });

    test('ARIA labels', function() {
      elem.dataset.l10nId = 'a11y-label';
      _translate(elem);
      assert.equal(elem.getAttribute('aria-label'), 'label via ARIA');
    });
  });

  suite('localize', function() {
    var elem;
    setup(function() {
      elem = document.createElement('div');
    });

    test('text content', function() {
      _localize(elem, 'textcontent-test');
      assert.equal(elem.textContent, 'this is text content');
    });

    test('properties', function() {
      _localize(elem, 'prop-test');
      assert.equal(elem.prop, 'this is a property');
    });

    suite('properties + pluralization', function() {
      test('n=0', function() {
        _localize(elem, 'update', { n: 0 });
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.isNull(span);
        assert.equal(info.textContent, 'No updates.');
      });

      test('n=1', function() {
        _localize(elem, 'update', { n: 1 });
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.ok(span);
        assert.equal(info.textContent, '1 update available.');
      });

      test('n=2', function() {
        _localize(elem, 'update', { n: 2 });
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.ok(span);
        assert.equal(info.textContent, '2 updates available.');
      });
    });

    test('element with child', function() {
      elem.innerHTML = 'here is a button <button>(foo)</button>';
      _localize(elem, 'textcontent-test');
      assert.equal(elem.textContent, 'this is text content(foo)');
      assert.ok(elem.querySelector('button'));
    });
  });

  suite('translate existing', function() {
    function setLang(lang, done, callback) {
      window.addEventListener('localized', function onLocalized() {
        window.removeEventListener('localized', onLocalized);
        try {
          callback();
        } catch (e) {
          done(e);
        }
      });
      navigator.mozL10n.language.code = lang;
    }

    var elem;

    setup(function() {
      elem = document.createElement('div');
      document.body.appendChild(elem);
    });

    teardown(function() {
      document.body.removeChild(elem);
    });

    test('downloaded translation', function(done) {
      elem.dataset.l10nId = 'cropimage';
      assert.equal(elem.textContent, '');
      setLang('fr', done, function() {
        assert.equal(elem.textContent, 'Crop');
        done();
      });
    });

    test('inline translation', function(done) {
      elem.dataset.l10nId = 'inline-translation-test';
      assert.equal(elem.textContent, '');
      setLang('fr', done, function() {
        assert.equal(elem.textContent,
            'static content provided by inlined JSON');
        done();
      });
    });

  });
});

