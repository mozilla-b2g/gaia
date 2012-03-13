
function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';

  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let dialerWindow = dialerFrame.contentWindow;

      // simulating one outgoing call and one incoming call
      dialerWindow.Recents.history(function(initialHistory) {
        var initialCount = initialHistory.length;

        var callScreen = dialerWindow.CallHandler.callScreen;

        dialerWindow.CallHandler.call('42424242');
        callScreen.addEventListener('transitionend', function trWait() {
          callScreen.removeEventListener('transitionend', trWait);
          dialerWindow.CallHandler.end();
          dialerWindow.CallHandler.disconnected();

          callScreen.addEventListener('transitionend', function trWait() {
            callScreen.removeEventListener('transitionend', trWait);
            var fakeCall = {
              addEventListener: function() {},
              answer: function() {},
              hangUp: function() {},
              removeEventListener: function() {},
              state: 'dialing',
              number: '123-4242-4242'
            };
            dialerWindow.CallHandler.incoming(fakeCall);

            callScreen.addEventListener('transitionend', function trWait() {
              callScreen.removeEventListener('transitionend', trWait);
              dialerWindow.CallHandler.answer();
              dialerWindow.CallHandler.connected();
              dialerWindow.CallHandler.end();
              dialerWindow.CallHandler.disconnected();

              dialerWindow.Recents.history(function(history) {
                ok(history.length == (initialCount + 2),
                   'Calls added to recents history');

                var recentsView =
                  dialerWindow.document.getElementById('recents-view');

                waitFor(function() {
                  var recents = recentsView.querySelectorAll('.recent');
                  ok(recents[0].classList.contains('incoming-connected'),
                     'Incoming call displayed');
                  ok(recents[1].classList.contains('outgoing-refused'),
                     'Outgoing call displayed');

                  windowManager.closeForegroundWindow();
                }, function() {
                  let recents = recentsView.querySelectorAll('.recent');
                  return (recents.length == (initialCount + 2));
                });
              });
            });
          });
        });
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
