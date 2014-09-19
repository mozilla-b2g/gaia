'use strict';

/* global LockScreenNotificationBuilder */

requireApp('system/js/lockscreen_notification_builder.js');

suite('System > LockScreenNotificationBuilder', function() {
  var subject;
  setup(function(){
    subject = new LockScreenNotificationBuilder();
    subject.start(document.createElement('div'));
  });

  test('it can decorate existing notification node with the actionable button',
  function() {
    var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    var node = document.createElement('div');
    node.dataset.notificationId = 'foobar';
    subject.decorate(node);
    subject.highlight(node);
    var button = node.querySelector('.button-actionable');
    assert.notEqual(null, button,
      'the node comes without the actionable button');
    var evtTouchStart = new CustomEvent('touchstart');
    evtTouchStart.touches = [
      {pageX: 1, pageY: 1}
    ];  // XXX: To avoid throw error from bootstrap.js.

    var evtTouchEnd = new CustomEvent('touchend');
    evtTouchStart.changedTouches = [
      {pageX: 1, pageY: 1}
    ];  // XXX: To avoid throw error from bootstrap.js.
    button.dispatchEvent(evtTouchStart);
    button.dispatchEvent(evtTouchEnd);
    assert.isTrue(stubDispatchEvent.calledWithMatch(function(evt) {
      return 'lockscreen-notification-clicked' === evt.type &&
            node.dataset.notificationId === evt.detail.notificationId;
    }), 'after pressing the button, the events did\'nt fire');
  });

  suite('top-actionable class is correctly added', function() {
    // for the test's sake, add 6 notifications, and test if a notification at
    // the specific index is matched.

    const numTestNotifications = 6;

    // little helper for looping a specific number of iterations
    var rangeGenerator = function *(max) {
      for(var i = 0; i < max; i++){
        yield i;
      }
    };

    suiteSetup(function(){
      sinon.stub(window, 'dispatchEvent');
      sinon.stub(window, 'setTimeout');
    });

    var stubGetWindowInnerHeight;

    setup(function(){
      stubGetWindowInnerHeight =
        this.sinon.stub(subject, '_getWindowInnerHeight');

      Array.from(rangeGenerator(numTestNotifications)).forEach(() => {
        var node = document.createElement('div');
        node.classList.add('notification');
        subject.container.appendChild(node);
      });
    });

    // the test flow is as:
    // we highlight the Xth-last notification as specified the test case
    // and test the presence of top-actionable class.
    // then we highlight other notifications (i.e. except from Xth-last)
    // and test the absence of top-actionable class.

    var testTopActionableClass = function(targetNotificationIndex) {
      var topNode = subject.container.childNodes[targetNotificationIndex];
      subject.highlight(topNode);
      assert.isTrue(subject.container.classList.contains('top-actionable'));

      // now if we highlight other notifications,
      // top-actionable should not be activated
      subject.container.classList.remove('top-actionable');

      Array.from(rangeGenerator(numTestNotifications)).forEach(idx => {
        if(targetNotificationIndex === idx){
          return;
        }

        var otherNode = subject.container.childNodes[idx];
        subject.highlight(otherNode);
        assert.isFalse(subject.container.classList.contains('top-actionable'));
      });
    };

    test('innerHeight > 480, without music player (4th-last notification)',
    function() {
      stubGetWindowInnerHeight.returns(640);

      // 4th-last notification = 3rd notification, indexed by 2
      testTopActionableClass(2);
    });

    test('innerHeight > 480, with music player (3rd-last notification)',
    function() {
      stubGetWindowInnerHeight.returns(640);
      subject.container.classList.add('collapsed');

      // 3rd-last notification = 4th notification, indexed by 3
      testTopActionableClass(3);
    });

    test('innerHeight <= 480, without music player (3rd-last notification)',
    function() {
      stubGetWindowInnerHeight.returns(360);

      // 3rd-last notification = 4th notification, indexed by 3
      testTopActionableClass(3);
    });

    test('innerHeight <= 480, with music player (2nd-last notification)',
    function() {
      stubGetWindowInnerHeight.returns(360);
      subject.container.classList.add('collapsed');

      // 2nd-last notification = 5th notification, indexed by 4
      testTopActionableClass(4);
    });
  });

  test('removeHighlight removes top-actionable class',
  function() {
    subject.container.classList.add('top-actionable');
    assert.isTrue(subject.container.classList.contains('top-actionable'),
                  'top-actionable class is absent while it shouldn\'t be');
    var dummyNode = document.createElement('div');
    var dummyInnerNode = document.createElement('div');
    dummyInnerNode.classList.add('button-actionable');
    dummyNode.appendChild(dummyInnerNode);
    subject.removeHighlight(dummyNode);
    assert.isFalse(subject.container.classList.contains('top-actionable'),
                   'top-actionable class is not absent while it should be');
  });
});
