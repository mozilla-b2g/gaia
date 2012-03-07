
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let dialerWindow = dialerFrame.contentWindow;

      dialerWindow.navigator.mozTelephony.dial = function fake_dial(number) {
        ok(number == '5707534296', 'Phone number sanitized');
        windowManager.closeForegroundWindow();

        var fakeCall = {number: '123', addEventListener: function() {}};
        return fakeCall;
      };

      dialerWindow.CallHandler.call('570-753-4296');
    }

    function onClose() {
      windowManager.kill(url);
      finish();
    }

    let appFrame = windowManager.launch(url).element;
    ApplicationObserver(appFrame, onReady, onClose);
  });
}
