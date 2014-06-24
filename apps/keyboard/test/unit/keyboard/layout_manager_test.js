'use strict';

/* global LayoutLoader, LayoutManager */

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
      assert.deepEqual(window.Keyboards, {});

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
      assert.deepEqual(window.Keyboards, {});

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
});

suite('LayoutManager', function() {
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

  test('start', function() {
    window.Keyboards = {};

    var manager = new LayoutManager();
    manager.start();

    assert.equal(manager.currentLayout, null, 'started with no layout.');
  });

  test('switchCurrentLayout', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager();
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.equal(manager.currentLayout, layout, 'currentLayout is set');

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('switchCurrentLayout (failed loader)', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager();
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('bar');
    p.then(function() {
      assert.isTrue(false, 'should not resolve');

      done();
    }, function() {
      assert.isTrue(true, 'rejected');

      done();
    });
  });

  test('switchCurrentLayout (twice)', function(done) {
    window.Keyboards = {};

    var manager = new LayoutManager();
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p1 = manager.switchCurrentLayout('foo');
    var p2 = manager.switchCurrentLayout('foo');
    p1.then(function() {
      assert.isTrue(false, 'should not resolve');
    }, function() {
      assert.isTrue(true, 'rejected');
    });

    p2.then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.equal(manager.currentLayout, layout, 'currentLayout is set');

      done();
    }, function() {
      assert.isTrue(false, 'should not reject');

      done();
    });
  });

  test('switchCurrentLayout (reload after loaded)', function(done) {
    window.Keyboards = {
      'numberLayout': realKeyboards.numberLayout
    };

    var manager = new LayoutManager();
    manager.start();
    manager.loader.SOURCE_DIR = './fake-layouts/';

    var p = manager.switchCurrentLayout('foo');
    p.then(function() {
      assert.isTrue(true, 'resolved');
      var layout = manager.loader.getLayout('foo');
      assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
      assert.equal(manager.currentLayout, layout, 'currentLayout is set');

      var p2 = manager.switchCurrentLayout('foo');

      p2.then(function() {
        assert.isTrue(true, 'resolved');
        var layout = manager.loader.getLayout('foo');
        assert.deepEqual(layout, expectedFooLayout, 'foo loaded');
        assert.equal(manager.currentLayout, layout,
          'currentLayout is set');

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
});
