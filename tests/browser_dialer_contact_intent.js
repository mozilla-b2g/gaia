
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let dialerWindow = dialerFrame.contentWindow;
      dialerWindow.visibilityChanged('../dialer/dialer.html?choice=contact');

      ok(!dialerWindow.document.getElementById('contacts-view').hidden,
         'Contact view displayed');
      ok(dialerWindow.Contacts._loaded, 'Contacts loaded');

      windowManager.closeForegroundWindow();
    }

    function onClose() {
      windowManager.kill(url);
      finish();
    }

    let appFrame = windowManager.launch(url).element;
    ApplicationObserver(appFrame, onReady, onClose);
  });
}
