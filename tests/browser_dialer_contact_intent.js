
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getApplicationManager(function(launcher) {
    function onReady(dialerFrame) {
      let dialerWindow = dialerFrame.contentWindow;
      dialerWindow.visibilityChanged('../dialer/dialer.html?choice=contact');

      ok(!dialerWindow.document.getElementById('contacts-view').hidden,
         'Contact view displayed');
      ok(dialerWindow.Contacts._loaded, 'Contacts loaded');

      launcher.close();
    }

    function onClose() {
      launcher.kill(url);
      finish();
    }

    let application = launcher.launch(url);
    ApplicationObserver(application, onReady, onClose);
  });
}
