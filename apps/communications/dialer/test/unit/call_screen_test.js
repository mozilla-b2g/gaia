'use strict';

// The CallScreen binds stuff when evaluated so we load it
// after the fake dom and we don't want it to show up as a leak.
if (!this.CallScreen) {
  this.CallScreen = null;
}

suite('call screen', function() {
  var screen;
  var calls;
  var groupCalls;

  setup(function(done) {
    screen = document.createElement('div');
    screen.id = 'call-screen';
    document.body.appendChild(screen);

    calls = document.createElement('article');
    calls.id = 'calls';
    screen.appendChild(calls);

    groupCalls = document.createElement('article');
    groupCalls.id = 'group-call-details';
    screen.appendChild(groupCalls);

    // Replace the existing elements
    // Since we can't make the CallScreen look for them again
    if (CallScreen != null) {
      CallScreen.screen = screen;
      CallScreen.calls = calls;
    }

    requireApp('communications/dialer/js/call_screen.js', done);
  });

  teardown(function() {
    screen.parentNode.removeChild(screen);
  });

  suite('calls', function() {
    suite('bigDuration setter', function() {
      test('should toggle the class', function() {
        assert.isFalse(calls.classList.contains('big-duration'));
        CallScreen.bigDuration = true;
        assert.isTrue(calls.classList.contains('big-duration'));
        CallScreen.bigDuration = false;
        assert.isFalse(calls.classList.contains('big-duration'));
      });
    });

    suite('insertCall', function() {
      test('should insert the node in the calls article', function() {
        var fakeNode = document.createElement('section');
        CallScreen.insertCall(fakeNode);
        assert.equal(fakeNode.parentNode, CallScreen.calls);
      });
    });

    suite('moveToGroup', function() {
      test('should insert the node in the group calls article', function() {
        var fakeNode = document.createElement('section');
        CallScreen.moveToGroup(fakeNode);
        assert.equal(fakeNode.parentNode, CallScreen.groupCalls);
      });
    });
  });

  suite('toggling', function() {
    test('should toggle the displayed classlist', function() {
      var toggleSpy = this.sinon.spy(screen.classList, 'toggle');
      CallScreen.toggle();
      assert.isTrue(toggleSpy.calledWith('displayed'));
    });

    suite('when a callback is given', function() {
      var addEventListenerSpy;
      var removeEventListenerSpy;
      var spyCallback;

      setup(function() {
        addEventListenerSpy = this.sinon.spy(screen, 'addEventListener');
        removeEventListenerSpy = this.sinon.spy(screen, 'removeEventListener');
        spyCallback = this.sinon.spy();
        CallScreen.toggle(spyCallback);
      });

      test('should listen for transitionend', function() {
        assert.isTrue(addEventListenerSpy.calledWith('transitionend'));
      });

      suite('once the transition ended', function() {
        setup(function() {
          addEventListenerSpy.yield();
        });

        test('should remove the event listener', function() {
          assert.isTrue(removeEventListenerSpy.calledWith('transitionend'));
        });

        test('should trigger the callback', function() {
          assert.isTrue(spyCallback.calledOnce);
        });
      });
    });
  });
});
