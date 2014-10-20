'use strict';

/* global LayoutLoader, LayoutNormalizer */

require('/js/keyboard/layout_loader.js');
require('/js/keyboard/layout_normalizer.js');

suite('LayoutLoader', function() {
  var realKeyboards;

  var expectedFooLayout = {
    keys: [
      [
        { value: 'foo' }
      ]
    ]
  };

  var expectedFoo2Layout = {
    keys: [
      [
        { value: 'foo2' }
      ]
    ]
  };

  var expectedFoo3Layout = {
    keys: [
      [
        { value: 'foo3' }
      ]
    ]
  };

  suiteSetup(function() {
    realKeyboards = window.Keyboards;
    sinon.stub(LayoutNormalizer.prototype, 'normalize', function(){
      this._normalizedLayout = this._layout;
    });
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
      // the loader instantiates normalizer by using its getLayout
      // so testing this would test getLayout at the same time
      // (same for following tests)
      assert.deepEqual(
        loader._initializedLayouts.preloaded,
        {
          keys: [
            [
             { value: 'preloaded' }
            ]
          ]
        },
        'normalizer argument "layout" incorrect'
      );
    }, function(e) {
      if (e) {
        throw (e);
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  test('getLayoutAsync', function(done) {
    window.Keyboards = {};

    var loader = new LayoutLoader();
    loader.SOURCE_DIR = './fake-layouts/';
    loader.start();

    var p = loader.getLayoutAsync('foo');
    p.then(function(layout) {
      assert.deepEqual(
        loader._initializedLayouts.foo,
        expectedFooLayout,
        'normalizer argument "layout" incorrect'
      );
      assert.isTrue(true, 'loaded');
      assert.equal(layout, loader.getLayout('foo'));
    }, function(e) {
      if (e) {
        throw (e);
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
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
        loader._initializedLayouts.foo2,
        expectedFoo2Layout,
        'normalizer argument "layout" incorrect'
      );
      assert.deepEqual(
        loader._initializedLayouts.foo3,
        expectedFoo3Layout,
        'normalizer argument "layout" incorrect'
      );
      assert.deepEqual(window.Keyboards, {});

      var p2 = loader.getLayoutAsync('foo3');

      return p2;
    }).then(function(layout) {
      assert.equal(layout, loader.getLayout('foo3'));
    }, function(e) {
      if (e) {
        throw (e);
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
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

      return p2;
    }).then(function(layout) {
      assert.isTrue(true, 'loaded');
      assert.equal(layout, loader.getLayout('foo'));
    }, function(e) {
      if (e) {
        throw (e);
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });

  test('getLayoutAsync (failed)', function(done) {
    window.Keyboards = {};

    var loader = new LayoutLoader();
    loader.SOURCE_DIR = './fake-layouts/';
    loader.start();

    var p = loader.getLayoutAsync('bar');
    p.then(function() {
      assert.isTrue(false, 'should not resolve');
    }, function(e) {
      if (e) {
        throw (e);
      }
      assert.isTrue(true, 'rejected');
    }).then(done, done);
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
    }, function(e) {
      if (e) {
        throw (e);
      }
      assert.isTrue(false, 'should not reject');
    }).then(done, done);
  });
});
