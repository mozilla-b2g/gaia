/* global Process, Stream */
'use strict';

/**
 * Since Stream is just wrapping Process, so we could test both of them
 * at the same time.
 **/
requireApp('system/lockscreen/js/stream/process.js');
requireApp('system/lockscreen/js/stream/stream.js');

suite('Stream > ', function() {
  test(`stream would only handle events after it's ready,
        and after the process get stopped, it would stop to handle events`,
  function(done) {
    var stubHandler = this.sinon.stub();
    var stream = new Stream({
      events: ['foo'],
      interrupts: ['bar'],
      // A fake source is enough for testing.
      sources: [{
        start: () => {},
        stop: () => {}
      }]
    });
    stream
      .start(stubHandler)
      .ready()
      .onchange(new CustomEvent('foo'))
      .onchange(new CustomEvent('foo'))
      .next(() => {
        return stream.stop()
          .onchange(new CustomEvent('foo'))
          .next(() => {
            assert.isFalse(stubHandler.calledOnce);
            assert.isTrue(stubHandler.calledTwice);
            assert.isFalse(stubHandler.calledThrice);
          })
          .next(done)
          .rescue(done);
      });
  });

  test(`if it's interrupt, the handler would not be queued`,
  function(done) {
    var stubHandler = this.sinon.spy((evt) => {
      // The first 'foo' would be handled only after the stack
      // is empty, so the actual handling order is 'bar->bar->foo',
      // and then the queue get stuck since we don't resolve it,
      // which is also the moment we do assertion.
      if ('foo' === evt.type) {
        assert.isTrue(stubHandler.calledThrice);
        done();
      }
      var { promise } = Process.defer();
      return promise;
      // Don't resolve.
      // So the next handler would not be executed,
      // unless the event is an interrupt.
    });
    var stream = new Stream({
      events: ['foo'],
      interrupts: ['bar'],
      sources: [{
        start: () => {},
        stop: () => {}
      }]
    });
    stream
      .start(stubHandler)
      .ready()
      .onchange(new CustomEvent('foo'))       // execute
      .onchange(new CustomEvent('foo'))       // no execute
      .onchange(new CustomEvent('bar'))       // execute
      .onchange(new CustomEvent('bar'));      // execute
  });

});
