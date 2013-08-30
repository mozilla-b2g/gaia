'use strict';

// The CallScreen binds stuff when evaluated so we load it
// after the fake dom and we don't want it to show up as a leak.
if (!this.CallScreen) {
  this.CallScreen = null;
}

suite('call screen', function() {
  var screen;
  var calls;

  setup(function(done) {
    screen = document.createElement('div');
    screen.id = 'call-screen';
    document.body.appendChild(screen);

    calls = document.createElement('article');
    calls.id = 'calls';
    screen.appendChild(calls);

    requireApp('communications/dialer/js/call_screen.js', done);
  });

  teardown(function() {
    screen.parentNode.removeChild(screen);
  });

  suite('calls', function() {
    suite('callsCount setter', function() {
      test('should update the dataset', function() {
        assert.isUndefined(calls.dataset.count);
        CallScreen.callsCount = 12;
        assert.equal(calls.dataset.count, 12);
      });
    });

    suite('insertCall', function() {
      test('should insert the node in the calls article', function() {
        var fakeNode = document.createElement('section');
        CallScreen.insertCall(fakeNode);
        assert.equal(fakeNode.parentNode, CallScreen.calls);
      });
    });
  });
});
