
function test() {
  waitForExplicitFinish();

  function testDialerContactIntentAndFinish() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    var WindowManager = contentWindow.Gaia.WindowManager;

    // XXX: can't get this to work with waitFor, setTimouting for now
    setTimeout(function() {
      var dialerFrame = WindowManager.launch('../dialer/dialer.html').element;
      waitFor(function() {
        let dialerWindow = dialerFrame.contentWindow;
        dialerWindow.visibilityChanged('../dialer/dialer.html?choice=contact');

        ok(!dialerWindow.document.getElementById('contacts-view').hidden,
           'Contact view displayed');
        ok(dialerWindow.Contacts._loaded, 'Contacts loaded');
        finish();
      }, function() {
        let dialerWindow = dialerFrame.contentWindow;
        return 'KeyHandler' in dialerWindow && dialerWindow.document.getElementById('contacts-view') != null;
      });
    }, 300);
  }

  waitFor(testDialerContactIntentAndFinish, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return 'Gaia' in contentWindow && 'WindowManager' in contentWindow.Gaia;
  });
}
