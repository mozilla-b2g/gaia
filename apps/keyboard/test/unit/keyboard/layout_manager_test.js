'use strict';

/* global LayoutLoader */

require('/js/keyboard/layout_manager.js');

suite('LayoutLoader', function() {
  var realKeyboards;

  var expectedFooLayout = {
    keys: [
      [
        { value: 'foo' }
      ]
    ]
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
        ]
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
});
