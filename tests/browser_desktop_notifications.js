function generatorTest() {
  waitForExplicitFinish();
  yield testApp('http://dialer.gaiamobile.org', testDesktopNotifications);
  finish();
}

function testDesktopNotifications(window, document, nextStep) {
  let homescreenWin = content.wrappedJSObject;

  // Creating a desktop-notification
  var notification = window.navigator.mozNotification.createNotification(
    'Missed call', 'From 424242'
  );

  var clickedCalled = false;
  notification.onclick = function test_notificationClick() {
    clickedCalled = true;
  };

  // Checking if the notifications was displayed
  notification.show();
  var notificationsContainer = homescreenWin.NotificationScreen.container;
  yield until(function () {return notificationsContainer.children.length > 0;}, nextStep);
  ok(true, 'Notification was displayed');

  var hasNotifications = homescreenWin.document.getElementById('state-notifications');
  ok(hasNotifications.dataset.visible == 'true', 'Indicator displayed');

  // Testing the 'click' on a notification
  var notificationElement = notificationsContainer.children[0];
  EventUtils.sendMouseEvent({type: 'click'}, notificationElement);
  yield until(function() clickedCalled, nextStep);
  ok(true, 'Clicked callback was called');
  ok(notificationsContainer.children.length == 0, 'Notification removed');
  ok(!hasNotifications.dataset.visible, 'Indicator removed');

  // Testing the 'close' on a notification
  var otherNotification = window.navigator.mozNotification.createNotification(
    'Missed call', 'From 12345'
  );

  var closedCalled = false;
  otherNotification.onclose = function test_notificationClose() {
    closedCalled = true;
  };

  otherNotification.show();
  yield until(function () {return notificationsContainer.children.length > 0;}, nextStep);

  var notificationClose = notificationsContainer.children[0].querySelector('.close');
  EventUtils.sendMouseEvent({type: 'click'}, notificationClose);
  yield until(function() closedCalled, nextStep);
  ok(true, 'Closed callback was called');
  ok(notificationsContainer.children.length == 0, 'Notification removed');
}
