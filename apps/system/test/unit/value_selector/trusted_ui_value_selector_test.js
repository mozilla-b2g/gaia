'use strict';
/* global TrustedUiValueSelector, MocksHelper, MockEventTarget */

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/value_selector/value_selector.js');
requireApp('system/js/value_selector/trusted_ui_value_selector.js');
requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_event_target.js');

var mocksHelperForTrustedUiValueSelector = new MocksHelper([
  'LazyLoader'
]).init();

suite('Value Selector for trusted UI', function() {
  mocksHelperForTrustedUiValueSelector.attachTestHelpers();
  var context = {
    element: document.createElement('div')
  };
  var valueSelector;
  var realMozInputMethod = null;

  var fakeFocusEvent = {
    type: 'inputcontextfocus',
    detail: {
      type: 'input',
      inputType: 'select-one'
    },
    stopImmediatePropagation: sinon.stub(),
    preventDefault: sinon.stub()
  };

  var fakeBlurEvent = {
    type: 'inputcontextblur',
    stopImmediatePropagation: sinon.stub(),
    preventDefault: sinon.stub()
  };

  suiteSetup(function() {
    var dialogOverlay = document.createElement('div');
    dialogOverlay.classList.add('dialog-overlay');
  });

  setup(function() {
    navigator.mozInputMethod = {
      mgmt: new MockEventTarget()
    };

    valueSelector = new TrustedUiValueSelector(context);
    valueSelector.start();
    this.sinon.spy(valueSelector, 'handleEvent');
    this.sinon.stub(valueSelector, 'broadcast');
  });

  teardown(function() {
    valueSelector.stop();

    navigator.mozInputMethod = realMozInputMethod;
  });

  test('> will broadcast event to show value selector when active', function() {
    valueSelector.screen = document.createElement('div');
    valueSelector.active = true;

    navigator.mozInputMethod.mgmt.dispatchEvent(fakeFocusEvent);

    assert.isTrue(valueSelector.handleEvent.called);
    assert.isTrue(valueSelector.broadcast.calledOnce);
    assert.isTrue(valueSelector.broadcast.calledWith(
      'inputfocus', fakeFocusEvent.detail));
    assert.isTrue(valueSelector.screen.classList.contains('dialog'));
  });

  test('> will broadcast event when active', function() {
    valueSelector.screen = document.createElement('div');
    valueSelector.active = true;

    navigator.mozInputMethod.mgmt.dispatchEvent(fakeBlurEvent);

    assert.isTrue(valueSelector.handleEvent.called);
    assert.isTrue(valueSelector.broadcast.calledOnce);
    assert.isTrue(valueSelector.broadcast.calledWith(
      'inputblur', fakeBlurEvent.detail));
    assert.isTrue(valueSelector.broadcast.called);
    assert.isFalse(valueSelector.screen.classList.contains('dialog'));
  });

  test('> activate()', function() {
    var trustedUiFrame = document.createElement('div');
    valueSelector.activate(trustedUiFrame);

    assert.isTrue(valueSelector.active);
    assert.equal(valueSelector.trustedUiFrame, trustedUiFrame);
  });

  test('> deactivate()', function() {
    valueSelector.deactivate();
    assert.isFalse(valueSelector.active);
  });

  test('> setVisibleForScreenReader(true)', function() {
    valueSelector.trustedUiFrame = document.createElement('div');
    valueSelector._setVisibleForScreenReader(true);
    assert.equal(valueSelector.trustedUiFrame.getAttribute('aria-hidden'),
                 'false');
  });

  test('> setVisibleForScreenReader(false)', function() {
    valueSelector.trustedUiFrame = document.createElement('div');
    valueSelector._setVisibleForScreenReader(false);
    assert.equal(valueSelector.trustedUiFrame.getAttribute('aria-hidden'),
                 'true');
  });
});
