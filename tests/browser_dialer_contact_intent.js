
function test() {
  SimpleTest.__appTestFinished = false;

  appTest('../dialer/dialer.html', function(dialerFrame) {
    waitFor(function() {
      let dialerWindow = dialerFrame.contentWindow;
      dialerWindow.visibilityChanged('../dialer/dialer.html?choice=contact');

      ok(!dialerWindow.document.getElementById('contacts-view').hidden,
         'Contact view displayed');
      ok(dialerWindow.Contacts._loaded, 'Contacts loaded');

      SimpleTest.__appTestFinished = true;
    }, function() {
      let dialerWindow = dialerFrame.contentWindow;
      return 'KeyHandler' in dialerWindow;
    });
  });
}
