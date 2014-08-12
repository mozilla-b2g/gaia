/* global LockScreenEventQueue */

'use strict';
requireApp('system/js/lockscreen_event_queue.js');
suite('sytem/LockScreenEventQueue', function() {
  var subject;
  setup(function() {
    subject = new LockScreenEventQueue();
  });
  test('it should register all events to the forwarded handler', function() {
    var handleFoo = this.sinon.stub(),
        handleBar = this.sinon.stub();
    var originalHandler = function(evt) {
      if ('foo' === evt.type) {
        handleFoo();
      } else if ('bar' === evt.type) {
        handleBar();
      }
    };
    subject.start([
      'foo',
      'bar'
    ], originalHandler);
    this.sinon.stub(window, 'setInterval', function(cb, interval) {
      cb();
    });
    subject.handleEvent(new CustomEvent('foo'));
    subject.handleEvent(new CustomEvent('bar'));
    assert.isTrue(handleFoo.called);
    assert.isTrue(handleBar.called);
  });
});
