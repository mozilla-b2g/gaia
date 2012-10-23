(function notification(text, desc) {
  window.addEventListener('mozChromeEvent', function(e) {
    var detail = e.detail;
    if (detail.type === 'desktop-notification') {
      marionetteScriptFinished(JSON.stringify(detail));
    }
  });

  var notify = window.navigator.mozNotification;
  var notification = notify.createNotification(
    text, desc
  );

  notification.show();
}.apply(this, arguments));
