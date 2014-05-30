'use strict';

/* global MockEventTarget, InputAppsTransitionManager */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/js/input_transition.js');

suite('InputAppsTransitionManager', function() {
  var element;
  setup(function() {
    element = new MockEventTarget();
    element.classList = {
      add: this.sinon.stub(),
      remove: this.sinon.stub()
    };
    this.sinon.spy(element, 'addEventListener');
    this.sinon.spy(element, 'removeEventListener');
    this.sinon.stub(document, 'getElementById').returns(element);
    this.sinon.spy(document.body, 'dispatchEvent');
  });

  teardown(function() {
    element = undefined;
    document.getElementById.restore();
    document.body.dispatchEvent.restore();
  });

  test('start()', function() {
    var manager = new InputAppsTransitionManager();
    manager.start();

    assert.isTrue(document.getElementById.calledWith(manager.ELEMENT_ID));
    assert.isTrue(
      element.addEventListener.calledWith('transitionend', manager));
    assert.equal(manager.currentState, manager.STATE_HIDDEN);
  });

  test('stop()', function() {
    var manager = new InputAppsTransitionManager();
    manager.start();
    manager.stop();

    assert.isTrue(
      element.removeEventListener.calledWith('transitionend', manager));
    assert.equal(manager.currentState, undefined);
  });

  test('handleResize()', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    // First handleResize() take us to STATE_TRANSITION_IN
    manager.handleResize(123);
    assert.equal(manager.occupyingHeight, 123);
    assert.equal(manager.currentState, manager.STATE_TRANSITION_IN);
    assert.equal(manager.onstatechange.callCount, 1);
    assert.equal(document.body.dispatchEvent.called, false);

    // handleResize() during STATE_TRANSITION_IN updates the height
    // but should have no other side effect.
    manager.handleResize(223);
    assert.equal(manager.occupyingHeight, 223);
    assert.equal(manager.currentState, manager.STATE_TRANSITION_IN);
    assert.equal(manager.onstatechange.callCount, 1);
    assert.equal(document.body.dispatchEvent.called, false);
    assert.isTrue(element.classList.remove.calledWith('hide'));
    assert.isTrue(element.classList.remove.calledWith('no-transition'));

    // opacity transitionend event should be ignored
    var opacityTransitionendEvent = {
      type: 'transitionend',
      propertyName: 'opacity',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(opacityTransitionendEvent);
    assert.equal(manager.currentState, manager.STATE_TRANSITION_IN);
    assert.equal(manager.onstatechange.callCount, 1);
    assert.equal(document.body.dispatchEvent.called, false);

    // transform transitionend event should bring us to STATE_VISIBLE
    var transformTransitionendEvent = {
      type: 'transitionend',
      propertyName: 'transform',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(transformTransitionendEvent);
    assert.equal(manager.currentState, manager.STATE_VISIBLE);
    assert.isTrue(manager.onstatechange.calledTwice);
    assert.isTrue(document.body.dispatchEvent.calledOnce);

    var evt = document.body.dispatchEvent.getCall(0).args[0];
    assert.equal(evt.type, 'keyboardchange');
    assert.equal(evt.detail.height, 223);

    // handleResize() to the same size should have no effect.
    manager.handleResize(223);
    assert.equal(manager.currentState, manager.STATE_VISIBLE);
    assert.isTrue(manager.onstatechange.calledTwice);
    assert.isTrue(document.body.dispatchEvent.calledOnce);

    // handleResize() to different size should have a event.
    manager.handleResize(203);
    assert.equal(manager.currentState, manager.STATE_VISIBLE);
    assert.isTrue(manager.onstatechange.calledTwice);
    assert.equal(document.body.dispatchEvent.callCount, 2);
    var evt2 = document.body.dispatchEvent.getCall(1).args[0];
    assert.equal(evt2.type, 'keyboardchange');
    assert.equal(evt2.detail.height, 203);

    manager.hide();
    assert.equal(manager.currentState, manager.STATE_TRANSITION_OUT);
    assert.equal(manager.onstatechange.callCount, 3);
    assert.equal(document.body.dispatchEvent.callCount, 3);

    // handleResize() on transition out should take us to TRANSITION_IN
    manager.handleResize(203);
    assert.equal(manager.currentState, manager.STATE_TRANSITION_IN);
    assert.equal(manager.onstatechange.callCount, 4);
    assert.equal(document.body.dispatchEvent.callCount, 3);
  });

  test('hide() (STATE_HIDDEN)', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    manager.hide();

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    assert.equal(manager.onstatechange.callCount, 0);
    assert.equal(document.body.dispatchEvent.called, false);
  });

  test('hide() (STATE_TRANSITION_IN)', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    manager.handleResize(123);

    manager.hide();

    assert.equal(manager.currentState, manager.STATE_TRANSITION_OUT);
    assert.isTrue(manager.onstatechange.calledTwice);
    assert.isTrue(document.body.dispatchEvent.calledOnce);
    var evt = document.body.dispatchEvent.getCall(0).args[0];
    assert.equal(evt.type, 'keyboardhide');
    assert.isTrue(element.classList.add.calledWith('hide'));
    assert.isTrue(element.classList.remove.calledWith('no-transition'));

    var transformTransitionendEvent2 = {
      type: 'transitionend',
      propertyName: 'transform',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(transformTransitionendEvent2);

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    assert.equal(manager.onstatechange.callCount, 3);
    assert.equal(document.body.dispatchEvent.callCount, 2);
    var evt2 = document.body.dispatchEvent.getCall(1).args[0];
    assert.equal(evt2.type, 'keyboardhidden');
  });


  test('hide() (STATE_VISIBLE)', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    // Go to STATE_VISIBLE
    manager.handleResize(123);
    var transformTransitionendEvent = {
      type: 'transitionend',
      propertyName: 'transform',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(transformTransitionendEvent);
    assert.equal(manager.currentState, manager.STATE_VISIBLE);

    manager.hide();

    assert.equal(manager.currentState, manager.STATE_TRANSITION_OUT);
    assert.equal(manager.onstatechange.callCount, 3);
    assert.isTrue(document.body.dispatchEvent.calledTwice);
    var evt = document.body.dispatchEvent.getCall(1).args[0];
    assert.equal(evt.type, 'keyboardhide');
    assert.isTrue(element.classList.add.calledWith('hide'));
    assert.isTrue(element.classList.remove.calledWith('no-transition'));

    var transformTransitionendEvent2 = {
      type: 'transitionend',
      propertyName: 'transform',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(transformTransitionendEvent2);

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    assert.equal(manager.onstatechange.callCount, 4);
    assert.equal(document.body.dispatchEvent.callCount, 3);
    var evt2 = document.body.dispatchEvent.getCall(2).args[0];
    assert.equal(evt2.type, 'keyboardhidden');
  });

  test('hide() (STATE_TRANSITION_OUT)', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    // Go to STATE_TRANSITION_OUT
    manager.handleResize(123);
    var transformTransitionendEvent = {
      type: 'transitionend',
      propertyName: 'transform',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(transformTransitionendEvent);
    manager.hide();
    assert.equal(manager.currentState, manager.STATE_TRANSITION_OUT);

    manager.hide();

    assert.equal(manager.currentState, manager.STATE_TRANSITION_OUT);
    assert.equal(manager.onstatechange.callCount, 3);
    assert.isTrue(document.body.dispatchEvent.calledTwice);
    var evt = document.body.dispatchEvent.getCall(1).args[0];
    assert.equal(evt.type, 'keyboardhide');
    assert.isTrue(element.classList.add.calledWith('hide'));
    assert.isTrue(element.classList.remove.calledWith('no-transition'));

    var transformTransitionendEvent2 = {
      type: 'transitionend',
      propertyName: 'transform',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(transformTransitionendEvent2);

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    assert.equal(manager.onstatechange.callCount, 4);
    assert.equal(document.body.dispatchEvent.callCount, 3);
    var evt2 = document.body.dispatchEvent.getCall(2).args[0];
    assert.equal(evt2.type, 'keyboardhidden');
  });

  test('hideImmediately() (STATE_HIDDEN)', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    manager.hideImmediately();

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    assert.equal(manager.onstatechange.callCount, 0);
    assert.equal(document.body.dispatchEvent.called, false);
  });

  test('hideImmediately() (STATE_TRANSITION_IN)', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    manager.handleResize(123);

    manager.hideImmediately();

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    assert.equal(manager.onstatechange.callCount, 3);
    assert.equal(document.body.dispatchEvent.callCount, 2);
    var evt = document.body.dispatchEvent.getCall(0).args[0];
    assert.equal(evt.type, 'keyboardhide');
    assert.isTrue(element.classList.add.calledWith('hide'));
    assert.isTrue(element.classList.add.calledWith('no-transition'));

    var evt2 = document.body.dispatchEvent.getCall(1).args[0];
    assert.equal(evt2.type, 'keyboardhidden');
  });

  test('hideImmediately() (STATE_VISIBLE)', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    // Go to STATE_VISIBLE
    manager.handleResize(123);
    var transformTransitionendEvent = {
      type: 'transitionend',
      propertyName: 'transform',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(transformTransitionendEvent);
    assert.equal(manager.currentState, manager.STATE_VISIBLE);

    manager.hideImmediately();

    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    assert.equal(manager.onstatechange.callCount, 4);
    assert.equal(document.body.dispatchEvent.callCount, 3);
    var evt = document.body.dispatchEvent.getCall(1).args[0];
    assert.equal(evt.type, 'keyboardhide');
    assert.isTrue(element.classList.add.calledWith('hide'));
    assert.isTrue(element.classList.add.calledWith('no-transition'));

    var evt2 = document.body.dispatchEvent.getCall(2).args[0];
    assert.equal(evt2.type, 'keyboardhidden');
  });

  test('hideImmediately() (STATE_TRANSITION_OUT)', function() {
    var manager = new InputAppsTransitionManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();

    // Go to STATE_TRANSITION_OUT
    manager.handleResize(123);
    var transformTransitionendEvent = {
      type: 'transitionend',
      propertyName: 'transform',
      elapsedTime: 0.3,
      pseudoElement: ''
    };
    element.dispatchEvent(transformTransitionendEvent);
    manager.hide();
    assert.equal(manager.currentState, manager.STATE_TRANSITION_OUT);

    manager.hide();

    assert.equal(manager.currentState, manager.STATE_TRANSITION_OUT);
    assert.equal(manager.onstatechange.callCount, 3);
    assert.isTrue(document.body.dispatchEvent.calledTwice);
    var evt = document.body.dispatchEvent.getCall(1).args[0];
    assert.equal(evt.type, 'keyboardhide');
    assert.isTrue(element.classList.add.calledWith('hide'));
    assert.isTrue(element.classList.remove.calledWith('no-transition'));


    manager.hideImmediately();

    assert.isTrue(element.classList.add.calledWith('hide'));
    assert.isTrue(element.classList.add.calledWith('no-transition'));
    assert.equal(manager.currentState, manager.STATE_HIDDEN);
    assert.equal(manager.onstatechange.callCount, 4);
    assert.equal(document.body.dispatchEvent.callCount, 3);
    var evt2 = document.body.dispatchEvent.getCall(2).args[0];
    assert.equal(evt2.type, 'keyboardhidden');
  });
});
