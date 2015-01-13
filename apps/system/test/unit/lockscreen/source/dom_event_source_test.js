/* global DOMEventSource */
'use strict';

/**
 * To test if DOMEventSource can really register the events and forward to
 * the target handler.
 **/
requireApp('system/lockscreen/js/source/source_event.js');
requireApp('system/lockscreen/js/source/dom_event_source.js');

suite('DOMEventSource > ', function() {

  test(`DOMEventSource would forward events from native event listener`,
  function() {
    var stubForwardTo = this.sinon.stub();
    var stubAddEventListener =
      this.sinon.stub(window, 'addEventListener');
    var stubRemoveEventListener =
      this.sinon.stub(window, 'removeEventListener');
    var source = new DOMEventSource({
      events: ['foo']
    });
    source.start(stubForwardTo);
    assert.isTrue(stubAddEventListener.called);
    source.onchange(new CustomEvent('foo'));
    source.onchange(new CustomEvent('foo'));
    assert.isTrue(stubForwardTo.calledTwice);
    source.stop();
    assert.isTrue(stubRemoveEventListener.called);
    source.onchange(new CustomEvent('foo'));
    assert.isFalse(stubForwardTo.calledThrice);
  });
});

