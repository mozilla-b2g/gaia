'use strict';

/* global LayoutManager, KeyboardEvent */

require('/js/keyboard/layout_loader.js');
require('/js/keyboard/layout_manager.js');

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
