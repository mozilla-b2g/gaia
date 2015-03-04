'use strict';

/* global LockScreenNotificationBuilder */

requireApp('system/lockscreen/js/lockscreen_notification_builder.js');

suite('System > LockScreenNotificationBuilder', function() {
  var subject;
  setup(function(){
    subject = new LockScreenNotificationBuilder(
      document.createElement('div'));
    subject.start();
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
      return 'lockscreen-notification-request-activate' === evt.type &&
            node.dataset.notificationId === evt.detail.notificationId;
    }), 'after pressing the button, the events did\'nt fire');
  });
});
