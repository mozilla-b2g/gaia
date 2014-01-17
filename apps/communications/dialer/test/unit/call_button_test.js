'use strict';

/* global CallButton */

requireApp('communications/dialer/js/call_button.js');

suite('CallButton', function() {
  suite('init', function() {
    var element;
    setup(function() {
      element = document.createElement('div');
      this.sinon.spy(element, 'addEventListener');
      CallButton.init(element);
    });

    test('attach event listeners', function() {
      sinon.assert.calledWith(element.addEventListener, 'click');
    });
  });

  suite('callback', function() {
    var rootElement;
    var callButtonElement;
    var notCallButtonElement;

    setup(function() {
      callButtonElement = document.createElement('div');
      callButtonElement.classList.add('call-button');

      notCallButtonElement = document.createElement('div');

      rootElement = document.createElement('div');
      rootElement.appendChild(callButtonElement);
      rootElement.appendChild(notCallButtonElement);
    });

    suite('on a call-button element', function() {
      var evt;
      var callbackSpy;

      setup(function() {
        callbackSpy = this.sinon.spy();
        CallButton.init(rootElement, callbackSpy);
        evt = new MouseEvent('click', {
          'bubbles': true,
          'cancelable': true
        });
        this.sinon.spy(evt, 'stopImmediatePropagation');
        callButtonElement.dispatchEvent(evt);
      });

      test('should prevent default', function() {
        assert.isTrue(evt.defaultPrevented);
      });
      test('should stop propagation', function() {
        sinon.assert.called(evt.stopImmediatePropagation);
      });
      test('should call the callback with the event', function() {
        sinon.assert.calledWith(callbackSpy, evt);
      });
    });

    suite('on another element', function() {
      var evt;
      var callbackSpy;

      setup(function() {
        callbackSpy = this.sinon.spy();
        CallButton.init(rootElement, callbackSpy);
        evt = new MouseEvent('click', {
          'bubbles': true,
          'cancelable': true
        });
        this.sinon.spy(evt, 'stopImmediatePropagation');
        notCallButtonElement.dispatchEvent(evt);
      });

      test('should prevent default', function() {
        assert.isFalse(evt.defaultPrevented);
      });
      test('should stop propagation', function() {
        sinon.assert.notCalled(evt.stopImmediatePropagation);
      });
      test('should call the callback with the event', function() {
        sinon.assert.notCalled(callbackSpy);
      });
    });
  });
});
