'use strict';
suite('PostMessageProxy', function() {

  var PostMessageProxy;
  suiteSetup(function(done) {
    require(['panels/alarm/post_message_proxy'], function(proxy) {
      PostMessageProxy = proxy;
      done();
    });
  });

  test('sends and receives a message', function(done) {
    var proxy = PostMessageProxy.create(window, 'me');
    PostMessageProxy.receive('me', {
      method: function(arg) {
        assert.ok(arg === 'argument');
        done();
      }
    });
    proxy.method('argument');
  });

  test('passes a return value', function(done) {
    var proxy = PostMessageProxy.create(window, 'me');
    PostMessageProxy.receive('me', {
      method: function(arg) {
        return 'SOME RESULT';
      }
    });
    proxy.method('argument').then(function(value) {
      assert.equal(value, 'SOME RESULT');
      done();
    });
  });

  function MyError(message) {
    this.name = 'MyError';
  }
  MyError.prototype = new Error();
  MyError.prototype.constructor = MyError;

  test('passes an exception', function(done) {
    var proxy = PostMessageProxy.create(window, 'me');
    PostMessageProxy.receive('me', {
      method: function(arg) {
        throw new MyError('foo');
      }
    });
    proxy.method('argument').catch(function(error) {
      assert.equal(error.name, 'MyError');
      assert.ok(error.stack.length > 0);
      done();
    });
  });

  test('only receives messages for proper ID', function(done) {
    PostMessageProxy.create(window, 'proxy1');
    var proxy2 = PostMessageProxy.create(window, 'proxy2');
    PostMessageProxy.receive('proxy1', {
      callProxy: function(arg) {
        assert.fail('should not have received this');
        done();
      }
    });
    PostMessageProxy.receive('proxy2', {
      callProxy: function(arg) {
        done();
      }
    });

    proxy2.callProxy();
  });

});

