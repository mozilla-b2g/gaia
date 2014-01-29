/*global requireApp suite test assert setup teardown sinon mocha
  suiteTeardown suiteSetup */
suite('Page', function() {
  mocha.setup({
    globals: [
      'Key',
      'KeyboardPage',
      'KeyboardLayout'
    ]
  });

  var KeyboardPage;
  var keyCtor;

  suiteSetup(function(next) {
    requireApp('demo-keyboard/js/key.js', function() {
      requireApp('demo-keyboard/js/page.js', function() {
        KeyboardPage = window.KeyboardPage;
        keyCtor = sinon.spy(window, 'Key');
        next();
      });
    });
  });

  setup(function() {
    // @TODO: this is not right!
    window.KeyboardLayout = { predefinedKeys: [] };
    keyCtor.reset();
  });

  test('Simple layout', function() {
    var layout = ['a b c', 'd e f'];
    var page = new KeyboardPage('wopwopwop', 'variant', layout, null, null);
    assert.equal(page.name, 'wopwopwop', 'Name is correct');
    assert.equal(page.variant, 'variant', 'Variant is correct');
    assert.deepEqual(page.rows, [['a', 'b', 'c'], ['d', 'e', 'f']],
      'Rows have been mapped');
    assert.deepEqual(Object.keys(page.keys), ['a', 'b', 'c', 'd', 'e', 'f'],
      'All keys are present');
  });

  suite('Keys', function() {
    test('Alpha key', function() {
      var page = new KeyboardPage(null, null, ['j']);
      var key = page.keys.j;
      assert.equal(key.name, 'j');
      assert.equal(key.keycap, 'j');
      assert.equal(key.keycmd, 'sendkey');
      assert.equal(key.keycode, 106);
    });

    test('Predefined key', function() {
      window.KeyboardLayout.predefinedKeys.BACKSPACE = {
        keycmd: 'backspace',
        keycap: '⌫',
        keycode: 8
      };

      var page = new KeyboardPage(null, null, ['BACKSPACE']);
      var key = page.keys.BACKSPACE;
      assert.equal(key.name, 'BACKSPACE');
      assert.equal(key.keycap, '⌫');
      assert.equal(key.keycmd, 'backspace');
      assert.equal(key.keycode, 8);
    });

    test('Two same keys results in one', function() {
      var page = new KeyboardPage(null, null, ['x x']);
      assert.deepEqual(Object.keys(page.keys), ['x']);
      assert.equal(keyCtor.callCount, 1,
        'Key constructor count');
    });

    suite('Alternatives', function() {
      test('Alternative layout keys should also be added', function() {
        var page = new KeyboardPage(null, null, ['q'], {
          q: { alternatives: '1' }
        });
        assert.deepEqual(Object.keys(page.keys), ['1', 'q']);
      });

      test('Alternative layout key that already exists', function() {
        var page = new KeyboardPage(null, null, ['q', 'i'], {
          q: { alternatives: 'i' }
        });
        assert.deepEqual(Object.keys(page.keys), ['q', 'i']);
        assert.equal(keyCtor.callCount, 2,
          'Key constructor count');
      });
    });
  });
});
