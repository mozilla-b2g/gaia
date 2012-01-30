
function test() {
  waitForExplicitFinish();

  appTest(function(appManager) {
    var dialerFrame = appManager.launch('../dialer/dialer.html');
    waitFor(function() {
      let dialerWindow = dialerFrame.contentWindow;
      dialerWindow.visibilityChanged('../dialer/dialer.html?choice=contact');

      ok(!dialerWindow.document.getElementById('contacts-view').hidden,
         'Contact view displayed');
      ok(dialerWindow.Contacts._loaded, 'Contacts loaded');
      finish();
    }, function() {
      let dialerWindow = dialerFrame.contentWindow;
      return 'KeyHandler' in dialerWindow;
    });
  });
}
