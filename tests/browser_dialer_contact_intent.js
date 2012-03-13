
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let dialerWindow = dialerFrame.contentWindow;
      var fakeEvt = {
        data: {
          hidden: false
        }
      };
      dialerWindow.visibilityChanged('../dialer/dialer.html?choice=contact',
                                     fakeEvt);

      ok(!dialerWindow.document.getElementById('contacts-view').hidden,
         'Contact view displayed');

      waitFor(function() {
        var containerId = 'contacts-container';
        var container = dialerWindow.document.getElementById(containerId);
        ok(container.children.length > 0, 'Contacts displayed');
        windowManager.closeForegroundWindow();
      }, function() {
        return (('Contacts' in dialerWindow) && dialerWindow.Contacts._loaded);
      });
    }

    function onClose() {
      windowManager.kill(url);
      finish();
    }

    let appFrame = windowManager.launch(url).element;
    ApplicationObserver(appFrame, onReady, onClose);
  });
}
