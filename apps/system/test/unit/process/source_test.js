/* global Source */
'use strict';

/**
 * To test if Source can really register the events and forward to
 * the target handler.
 **/
requireApp('system/lockscreen/js/process/source.js');

suite('Source > ', function() {

  test(`Source would forward events from native event listener`,
  function() {
    var stubHandler = this.sinon.stub();
    var stubAddEventListener =
      this.sinon.stub(window, 'addEventListener');
    var stubRemoveEventListener =
      this.sinon.stub(window, 'removeEventListener');
    var source = Source.events(['foo']);
    source.start(stubHandler);
    assert.isTrue(stubAddEventListener.called);
    source.handleEvent(new CustomEvent('foo'));
    source.handleEvent(new CustomEvent('foo'));
    assert.isTrue(stubHandler.calledTwice);
    source.stop();
    assert.isTrue(stubRemoveEventListener.called);
    source.handleEvent(new CustomEvent('foo'));
    assert.isFalse(stubHandler.calledThrice);
  });

  test(`Source.timer would generate a source fire the event every [interval]`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubHandler = sinon.stub();
    var mockGenerator = (timestamp) => {
      return { 'timestamp': timestamp };
    };
    var source = Source.timer('thingshappen', mockGenerator, 100, 2);
    source.start(stubHandler);
    clock.tick(100);
    assert.isTrue(stubHandler.calledOnce);
    clock.tick(100);
    assert.isTrue(stubHandler.calledTwice);
    clock.tick(100);
    assert.isFalse(stubHandler.calledThrice);
  });

  test(`If no [times] Source.timer would not stop to fire the event`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubHandler = sinon.stub();
    var mockGenerator = (timestamp) => {
      return { 'timestamp': timestamp };
    };
    var source = Source.timer('thingshappen', mockGenerator, 100);
    source.start(stubHandler);
    clock.tick(100);
    assert.isTrue(stubHandler.calledOnce);
    clock.tick(100);
    assert.isTrue(stubHandler.calledTwice);
    clock.tick(100);
    assert.isTrue(stubHandler.calledThrice);
  });

  test(`If [times] is 1 Source.timer would fire the event once`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubHandler = sinon.stub();
    var mockGenerator = (timestamp) => {
      return { 'timestamp': timestamp };
    };
    var source = Source.timer('thingshappen', mockGenerator, 100, 1);
    source.start(stubHandler);
    clock.tick(100);
    assert.isTrue(stubHandler.calledOnce);
    clock.tick(100);
    assert.isFalse(stubHandler.calledTwice);
    clock.tick(100);
    assert.isFalse(stubHandler.calledThrice);
  });

  test(`Even if no [times] it would stil clear the timer`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubHandler = sinon.stub();
    var mockGenerator = (timestamp) => {
      return { 'timestamp': timestamp };
    };
    var source = Source.timer('thingshappen', mockGenerator, 100);
    source.start(stubHandler);
    clock.tick(100);
    assert.isTrue(stubHandler.calledOnce);
    clock.tick(100);
    assert.isTrue(stubHandler.calledTwice);
    source.stop();  // Should clear it.
    clock.tick(100);
    assert.isFalse(stubHandler.calledThrice);
  });
});
