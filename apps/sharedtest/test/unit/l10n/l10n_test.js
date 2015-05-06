suite('L10n', function() {
  'use strict';
  var _;
  var _translateFragment;

  var l10props = [
    'cropimage                 = Crop',
    'delete-n-items            = {[ plural(n) ]}',
    'delete-n-items[zero]      = Nothing selected',
    'delete-n-items[one]       = Delete selected item?',
    'delete-n-items[other]     = Delete {{ n }} items?',
    'textcontent-test          = this is text content',
    'dom-overlay-test          = this is text content <button>(bar)</button>',
    'attr-test.title           = this is an attribute',
    'euroSign                  = price: 10\\u20ac to 20\\u20ac',
    'leadingSpaces             = \\u0020\\u020\\u20%2F',
    'trailingBackslash         = backslash\\\\',
    'multiLine                 = foo \\',
    '                            bar \\',
    '                            baz',
    // XXX innerHTML is treated as value (https://bugzil.la/1142526)
    'update.innerHTML          = {[ plural(n) ]}',
    'update.innerHTML[zero]    = <strong>No updates.</strong>',
    'update.innerHTML[one]     = <strong>{{n}} update available.</strong> \\',
    '                            <span>Tap for more info.</span>',
    'update.innerHTML[other]   = <strong>{{n}} updates available.</strong> \\',
    '                            <span>Tap for more info.</span>',
    'overlay                    = {[ plural(n) ]}',
    'overlay[zero]              = <strong>No updates.</strong>',
    'overlay[one]               = <strong>{{n}} update available.</strong> \\',
    '                            <span>Tap for more info.</span>',
    'overlay[other]             = <strong>{{n}} updates available.</strong> \\',
    '                            <span>Tap for more info.</span>',
    'inline-translation-test   = static content provided by inlined JSON',
    'a11y-label.ariaLabel      = label via ARIA',
    'a11y-label.ariaValueText  = valuetext via ARIA',
    'a11y-label.ariaMozHint    = moz-hint via ARIA'
  ].join('\n');

  var inlineL10Props = {
    'inline-translation-test': 'static content provided by inlined JSON'
  };

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
    _translateFragment = navigator.mozL10n.translateFragment;

    // en-US has already been loaded in setup.js and l10n.js is smart enough
    // not to re-fetch resources;  hence, set the lang to something new
    var lang = 'fr';

    var inline = document.createElement('script');
    inline.setAttribute('type', 'application/l10n');
    inline.setAttribute('lang', lang);
    inline.textContent = JSON.stringify(inlineL10Props);
    document.head.appendChild(inline);

    navigator.mozL10n.ctx.registerLocales('en-US',
                                          ['fr', 'zh-TW', 'ar']);
    navigator.mozL10n.language.code = lang;
    navigator.mozL10n.once(done);
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

  suite('translateFragment', function() {
    var elem;
    setup(function() {
      elem = document.createElement('div');
    });

    test('text content', function() {
      elem.dataset.l10nId = 'textcontent-test';
      _translateFragment(elem);
      assert.equal(elem.textContent, 'this is text content');
    });

    test('properties', function() {
      elem.dataset.l10nId = 'attr-test';
      _translateFragment(elem);
      assert.equal(elem.getAttribute('title'), 'this is an attribute');
    });

    test('ARIA labels', function() {
      elem.dataset.l10nId = 'a11y-label';
      _translateFragment(elem);
      assert.equal(elem.getAttribute('aria-label'), 'label via ARIA');
    });

    test('ARIA valuetext', function() {
      elem.dataset.l10nId = 'a11y-label';
      _translateFragment(elem);
      assert.equal(elem.getAttribute('aria-valuetext'), 'valuetext via ARIA');
    });

    test('ARIA moz-hint', function() {
      elem.dataset.l10nId = 'a11y-label';
      _translateFragment(elem);
      assert.equal(elem.getAttribute('aria-moz-hint'), 'moz-hint via ARIA');
    });
  });

  suite('localize + translate', function() {
    var elem;
    setup(function() {
      elem = document.createElement('div');
    });

    test('text content', function() {
      navigator.mozL10n.setAttributes(elem, 'textcontent-test');
      _translateFragment(elem);
      assert.equal(elem.textContent, 'this is text content');
    });

    test('properties', function() {
      navigator.mozL10n.setAttributes(elem, 'attr-test');
      _translateFragment(elem);
      assert.equal(elem.getAttribute('title'), 'this is an attribute');
    });

    // XXX Remove in https://bugzil.la/1027117
    suite('properties + pluralization', function() {
      test('n=0', function() {
        navigator.mozL10n.setAttributes(elem, 'update', { n: 0 });
        _translateFragment(elem);
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.isNull(span);
        assert.equal(info.textContent, 'No updates.');
      });

      test('n=1', function() {
        navigator.mozL10n.setAttributes(elem, 'update', { n: 1 });
        _translateFragment(elem);
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.ok(span);
        assert.equal(info.textContent, '1 update available.');
      });

      test('n=2', function() {
        navigator.mozL10n.setAttributes(elem, 'update', { n: 2 });
        _translateFragment(elem);
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.ok(span);
        assert.equal(info.textContent, '2 updates available.');
      });
    });

    suite('DOM overlays + pluralization', function() {
      test('n=0', function() {
        navigator.mozL10n.setAttributes(elem, 'overlay', { n: 0 });
        _translateFragment(elem);
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.isNull(span);
        assert.equal(info.textContent, 'No updates.');
      });

      test('n=1', function() {
        navigator.mozL10n.setAttributes(elem, 'overlay', { n: 1 });
        _translateFragment(elem);
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.ok(span);
        assert.equal(info.textContent, '1 update available.');
      });

      test('n=2', function() {
        navigator.mozL10n.setAttributes(elem, 'overlay', { n: 2 });
        _translateFragment(elem);
        var info = elem.querySelector('strong');
        var span = elem.querySelector('span');
        assert.ok(info);
        assert.ok(span);
        assert.equal(info.textContent, '2 updates available.');
      });
    });

    test('element with child, translation without a child', function() {
      elem.innerHTML = 'here is a button <button>(foo)</button>';
      navigator.mozL10n.setAttributes(elem, 'textcontent-test');
      _translateFragment(elem);
      assert.equal(elem.innerHTML, 'this is text content');
    });

    test('element and translation with child', function() {
      elem.innerHTML = 'here is a button <button>(foo)</button>';
      navigator.mozL10n.setAttributes(elem, 'dom-overlay-test');
      _translateFragment(elem);
      assert.equal(elem.innerHTML,
                   'this is text content <button>(bar)</button>');
    });
  });

  suite('translate existing', function() {
    function setLang(lang, callback) {
      // we want onLocalized to be invoked only *after* the language change
      window.addEventListener('localized', function onLocalized() {
        window.removeEventListener('localized', onLocalized);
        callback();
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

    test('inline translation', function(done) {
      elem.dataset.l10nId = 'inline-translation-test';
      assert.equal(elem.textContent, '');
      setLang('zh-TW', function() {
        assert.equal(elem.textContent,
                     'static content provided by inlined JSON');
        done();
      });
    });

    test('downloaded translation', function(done) {
      elem.dataset.l10nId = 'cropimage';
      assert.equal(elem.textContent, '');
      setLang('ar', function() {
        assert.equal(elem.textContent, 'Crop');
        done();
      });
    });
  });
});
