'use strict';

/* global LayoutLoader */

require('/js/keyboard/layout_loader.js');

suite('LayoutLoader', function() {
  var realKeyboards;

  var expectedFooLayout = {
    keys: [
      [
        { value: 'foo' }
      ]
    ],
    alt: {},
    upperCase: {}
  };

  var expectedFoo2Layout = {
    keys: [
      [
        { value: 'foo2' }
      ]
    ],
    alt: {},
    upperCase: {}
  };

  var expectedFoo3Layout = {
    keys: [
      [
        { value: 'foo3' }
      ]
    ],
    alt: {},
    upperCase: {}
  };

  suiteSetup(function() {
    realKeyboards = window.Keyboards;
  });

  suiteTeardown(function() {
    window.Keyboards = realKeyboards;
  });

  test('start', function(done) {
    window.Keyboards = {
      'preloaded': {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ]
      }
    };

    var loader = new LayoutLoader();
    loader.start();

    assert.equal(!!window.Keyboards.preloaded, false, 'original removed');
    assert.isTrue(!!loader.getLayout('preloaded'), 'preloaded loaded');

    var p = loader.getLayoutAsync('preloaded');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(loader.getLayout('preloaded'), {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {},
        upperCase: {}
      }, 'preloaded loaded');
      assert.equal(layout, loader.getLayout('preloaded'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('getLayoutAsync', function(done) {
    window.Keyboards = {};

    var loader = new LayoutLoader();
    loader.SOURCE_DIR = './fake-layouts/';
    loader.start();

    var p = loader.getLayoutAsync('foo');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(
        loader.getLayout('foo'), expectedFooLayout, 'foo loaded');
      assert.equal(layout, loader.getLayout('foo'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('getLayoutAsync (init two layouts)', function(done) {
    window.Keyboards = {};

    var loader = new LayoutLoader();
    loader.SOURCE_DIR = './fake-layouts/';
    loader.start();

    var p = loader.getLayoutAsync('foo2');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(
        loader.getLayout('foo2'), expectedFoo2Layout, 'foo2 loaded');
      assert.equal(layout, loader.getLayout('foo2'));
      assert.deepEqual(window.Keyboards, {});

      assert.deepEqual(
        loader.getLayout('foo3'), expectedFoo3Layout, 'foo3 loaded');
      var p2 = loader.getLayoutAsync('foo3');
      p2.then(function(layout) {
        assert.equal(layout, loader.getLayout('foo3'));

        done();
      }, function() {
        assert.isTrue(false, 'should not reject');

        done();
      });
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('getLayoutAsync (twice after first one)', function(done) {
    window.Keyboards = {};

    var loader = new LayoutLoader();
    loader.SOURCE_DIR = './fake-layouts/';
    loader.start();

    var p = loader.getLayoutAsync('foo');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(
        loader.getLayout('foo'), expectedFooLayout, 'foo loaded');
      assert.equal(layout, loader.getLayout('foo'));

      var p2 = loader.getLayoutAsync('foo');
      assert.equal(p2, p,
        'Should return the same promise without creating a new one');

      p.then(function(layout) {
        assert.isTrue(true, 'loaded');
        assert.equal(layout, loader.getLayout('foo'));

        done();
      }, function() {
        assert.isTrue(false, 'should not reject');

        done();
      });
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('getLayoutAsync (failed)', function(done) {
    window.Keyboards = {};

    var loader = new LayoutLoader();
    loader.SOURCE_DIR = './fake-layouts/';
    loader.start();

    var p = loader.getLayoutAsync('bar');
    p.then(function() {
      assert.isTrue(false, 'should not resolve');

      done();
    }, function() {
      assert.isTrue(true, 'rejected');

      done();
    });
  });

  test('getLayoutAsync (twice at the same time)', function(done) {
    window.Keyboards = {};

    var loader = new LayoutLoader();
    loader.SOURCE_DIR = './fake-layouts/';
    loader.start();

    var p = loader.getLayoutAsync('foo');
    var p2 = loader.getLayoutAsync('foo');

    assert.equal(p, p2, 'Return same promise instance for the same layout.');

    p.then(function() {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(
        loader.getLayout('foo'), expectedFooLayout, 'foo loaded');

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('normalize alt menu (single char keys)', function(done) {
    window.Keyboards = {
      'preloaded': {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'a': 'áàâäåãāæ'
        }
      }
    };

    var loader = new LayoutLoader();
    loader.start();

    assert.equal(!!window.Keyboards.preloaded, false, 'original removed');
    assert.isTrue(!!loader.getLayout('preloaded'), 'preloaded loaded');

    var p = loader.getLayoutAsync('preloaded');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(loader.getLayout('preloaded'), {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'a': [ 'á', 'à', 'â', 'ä', 'å', 'ã', 'ā', 'æ' ],
               'A': [ 'Á', 'À', 'Â', 'Ä', 'Å', 'Ã', 'Ā', 'Æ' ] },
        upperCase: {}
      }, 'preloaded loaded');
      assert.equal(layout, loader.getLayout('preloaded'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('normalize alt menu of sub-layout alternateLayout', function(done) {
    window.Keyboards = {
      'preloaded': {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alternateLayout: {
          keys: [
            [
              { value: 'preloaded-alternateLayout' }
            ]
          ],
          alt: {
            'a': 'áàâäåãāæ'
          }
        }
      }
    };

    var loader = new LayoutLoader();
    loader.start();

    assert.equal(!!window.Keyboards.preloaded, false, 'original removed');
    assert.isTrue(!!loader.getLayout('preloaded'), 'preloaded loaded');

    var p = loader.getLayoutAsync('preloaded');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(loader.getLayout('preloaded'), {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alternateLayout: {
          keys: [
            [
              { value: 'preloaded-alternateLayout' }
            ]
          ],
          alt: { 'a': [ 'á', 'à', 'â', 'ä', 'å', 'ã', 'ā', 'æ' ],
                 'A': [ 'Á', 'À', 'Â', 'Ä', 'Å', 'Ã', 'Ā', 'Æ' ] },
          upperCase: {}
        },
        alt: {},
        upperCase: {}
      }, 'preloaded loaded');
      assert.equal(layout, loader.getLayout('preloaded'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('normalize alt menu (with multi-char keys)', function(done) {
    window.Keyboards = {
      'preloaded': {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'a': 'á à â A$'
        }
      }
    };

    var loader = new LayoutLoader();
    loader.start();

    assert.equal(!!window.Keyboards.preloaded, false, 'original removed');
    assert.isTrue(!!loader.getLayout('preloaded'), 'preloaded loaded');

    var p = loader.getLayoutAsync('preloaded');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(loader.getLayout('preloaded'), {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'a': [ 'á', 'à', 'â', 'A$' ],
               'A': [ 'Á', 'À', 'Â', 'A$' ] },
        upperCase: {}
      }, 'preloaded loaded');
      assert.equal(layout, loader.getLayout('preloaded'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('normalize alt menu (with one multi-char keys)', function(done) {
    window.Keyboards = {
      'preloaded': {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'a': 'A$ '
        }
      }
    };

    var loader = new LayoutLoader();
    loader.start();

    assert.equal(!!window.Keyboards.preloaded, false, 'original removed');
    assert.isTrue(!!loader.getLayout('preloaded'), 'preloaded loaded');

    var p = loader.getLayoutAsync('preloaded');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(loader.getLayout('preloaded'), {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'a': [ 'A$' ],
               'A': [ 'A$' ] },
        upperCase: {}
      }, 'preloaded loaded');
      assert.equal(layout, loader.getLayout('preloaded'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('normalize alt menu (with Turkish \'i\' key)', function(done) {
    window.Keyboards = {
      'preloaded': {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'i': 'ß'
        },
        upperCase: {
          'i': 'İ'
        }
      }
    };

    var loader = new LayoutLoader();
    loader.start();

    assert.equal(!!window.Keyboards.preloaded, false, 'original removed');
    assert.isTrue(!!loader.getLayout('preloaded'), 'preloaded loaded');

    var p = loader.getLayoutAsync('preloaded');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(loader.getLayout('preloaded'), {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'i': [ 'ß' ],
               'İ': [ 'ß' ] },
        upperCase: {
          'i': 'İ'
        }
      }, 'preloaded loaded');
      assert.equal(layout, loader.getLayout('preloaded'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('normalize alt menu (with Catalan \'l·l\' key)', function(done) {
    window.Keyboards = {
      'preloaded': {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'l': 'l·l ł £'
        }
      }
    };

    var loader = new LayoutLoader();
    loader.start();

    assert.equal(!!window.Keyboards.preloaded, false, 'original removed');
    assert.isTrue(!!loader.getLayout('preloaded'), 'preloaded loaded');

    var expectedLayout = {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'l': [ 'l·l', 'ł', '£' ],
               'L': [ 'L·l', 'Ł', '£' ] },
        upperCase: {}
    };
    expectedLayout.alt.L.upperCaseLocked = [ 'L·L', 'Ł', '£' ];

    var p = loader.getLayoutAsync('preloaded');
    p.then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.deepEqual(loader.getLayout('preloaded'), expectedLayout,
        'preloaded loaded');
      assert.equal(layout, loader.getLayout('preloaded'));

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });
});
