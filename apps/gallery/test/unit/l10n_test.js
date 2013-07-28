/**
 * Tests for the shared l10n date code
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/l10n.js');

suite('L10n', function() {

  var _;
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
    '                            baz'
  ].join('\n');

  var key_cropImage = 'cropimage';
  var key_delete = 'delete-n-items';
  var key_euroSign = 'euroSign';
  var key_leadingSpaces = 'leadingSpaces';
  var key_multiLine = 'multiLine';
  var key_backslash = 'trailingBackslash';

  // Do not begin tests until the test locale has been loaded.
  suiteSetup(function(done) {
    var xhr = sinon.useFakeXMLHttpRequest();

    xhr.onCreate = function(request) {
      setTimeout(function() {
        request.respond(200, {}, l10props);
      }, 0);
    };

    _ = navigator.mozL10n.get;

    navigator.mozL10n.language.code = 'en-US';

    navigator.mozL10n.ready(function() {
      xhr.restore();
      done();
    });

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
    var translate = navigator.mozL10n.translate;
    var elem;

    setup(function() {
      elem = document.createElement('div');
    });

    test('text content', function() {
      elem.dataset.l10nId = 'textcontent-test';
      translate(elem);
      assert.equal(elem.textContent, 'this is text content');
    });

    test('properties', function() {
      elem.dataset.l10nId = 'prop-test';
      translate(elem);
      assert.equal(elem.prop, 'this is a property');
    });

    test('properties using final period', function() {
      elem.dataset.l10nId = 'dot.prop-test';
      translate(elem);
      assert.equal(elem.prop, 'this is another property');
    });

    test('data-* attributes', function() {
      elem.dataset.l10nId = 'dataset-test';
      translate(elem);
      assert.equal(elem.dataset.prop, 'this is a data attribute');
    });

    test('style attributes', function() {
      elem.dataset.l10nId = 'style-test';
      translate(elem);
      assert.equal(elem.style.padding, '10px');
    });
  });

});
