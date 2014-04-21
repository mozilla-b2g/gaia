'use strict';
/* global MockInputMethod, MockInputContext, Promise */

requireApp('keyboard/shared/test/unit/mocks/mock_event_target.js');
requireApp('keyboard/shared/test/unit/mocks/mock_navigator_input_method.js');

suite('MockInputMethod', function() {
  suite('new MockInputMethod()', function() {
    test('create w/o context', function() {
      var mozInputMethod = new MockInputMethod();

      assert.equal(mozInputMethod.inputcontext, null, 'context is null');
      assert.isTrue(!!mozInputMethod.mgmt, 'mgmt exists');
    });

    test('create with context', function() {
      var context = new MockInputContext();
      var mozInputMethod = new MockInputMethod(context);

      assert.equal(mozInputMethod.inputcontext, context,
        'context is context passed');
      assert.isTrue(!!mozInputMethod.mgmt, 'mgmt exists');
    });
  });
  suite('setInputContext()', function() {
    test('switch to new context', function(done) {
      var mozInputMethod = new MockInputMethod();
      var context = new MockInputContext();

      mozInputMethod.oninputcontextchange = function(evt) {
        assert.equal(evt.type, 'inputcontextchange', 'event name is correct');
        assert.equal(mozInputMethod.inputcontext, context,
          'context is the new context');

        done();
      };

      mozInputMethod.setInputContext(context);
    });

    test('switch away from context', function(done) {
      var context = new MockInputContext();
      var mozInputMethod = new MockInputMethod(context);

      mozInputMethod.oninputcontextchange = function(evt) {
        assert.equal(evt.type, 'inputcontextchange', 'event name is correct');
        assert.equal(mozInputMethod.inputcontext, null,
          'context is null');

        done();
      };

      mozInputMethod.setInputContext();
    });

    test('switch to the same context', function() {
      var context = new MockInputContext();
      var mozInputMethod = new MockInputMethod(context);

      mozInputMethod.oninputcontextchange = sinon.stub();

      mozInputMethod.setInputContext(context);

      assert.equal(mozInputMethod.inputcontext, context,
        'context is unchanged');
      assert.isTrue(!mozInputMethod.oninputcontextchange.called,
        'oninputcontextchange not called');
    });
  });
});

suite('MockInputContext', function(done) {
  test('fireSurroundingTextChange()', function(done) {
    var context = new MockInputContext();
    context.textBeforeCursor = 'before cursor';
    context.textAfterCursor = 'after cursor';
    context.onsurroundingtextchange = function(evt) {
      assert.equal(evt.type, 'surroundingtextchange', 'event name is correct');
      assert.equal(evt.detail.beforeString, context.textBeforeCursor,
        'beforeString is set');
      assert.equal(evt.detail.afterString, context.textAfterCursor,
        'afterString is set');

      done();
    };

    context.fireSurroundingTextChange();
  });
  test('fireSelectionChange()', function(done) {
    var context = new MockInputContext();
    context.selectionStart = 123;
    context.selectionEnd = 125;
    context.onselectionchange = function(evt) {
      assert.equal(evt.type, 'selectionchange', 'event name is correct');
      assert.equal(evt.detail.selectionStart, context.selectionStart,
        'selectionStart is set');
      assert.equal(evt.detail.selectionEnd, context.selectionEnd,
        'selectionEnd is set');

      done();
    };

    context.fireSelectionChange();
  });
  var promiseMethods = ['getText', 'setSelectionRange',
    'replaceSurroundingText', 'deleteSurroundingText', 'sendKey',
    'setComposition', 'endComposition'];

  promiseMethods.forEach(function(method) {
    test(method + '() (fulfill promise)', function(done) {
      var context = new MockInputContext();
      var p = context[method]();
      assert.isTrue(p instanceof Promise, 'returned a Promise instance');
      var result = {};
      p.then(function(val) {
        assert.equal(val, result, 'fulfilled with correct value');
        done();
      }, function() {
        assert.isTrue(false, 'should not reject');
      });
      p.resolve(result);
    });

    test(method + '() (reject promise)', function(done) {
      var context = new MockInputContext();
      var p = context[method]();
      assert.isTrue(p instanceof Promise, 'returned a Promise instance');
      p.then(function(val) {
        assert.isTrue(false, 'should not filfill');
      }, function() {
        assert.isTrue(true, 'promise rejected');
        done();
      });
      p.reject();
    });
  });
});
