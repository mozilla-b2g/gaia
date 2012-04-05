function generatorTest() {
  yield testApp('http://dialer.gaiamobile.org/', testDialerHistory);
}

function testDialerHistory(window, document, nextStep) {
  // simulating one outgoing call and one incoming call

  // Wait for the APIs we use in the test
  yield until(function() window.Recents && window.CallHandler, nextStep);

  var initialHistory = null;
  yield window.Recents.history(function(history) {
    initialHistory = history;
    nextStep();
  });

  var initialCount = initialHistory.length;
  var callScreen = window.CallHandler.callScreen;

  // Start a call and wait for the screen to settle down
  window.CallHandler.call('42424242');
  yield callScreen.addEventListener('transitionend', function trWait() {
    callScreen.removeEventListener('transitionend', trWait);
    nextStep();
  });

  // End the call and wait for the screen to settle down
  window.CallHandler.end();
  window.CallHandler.disconnected();
  yield callScreen.addEventListener('transitionend', function trWait() {
    callScreen.removeEventListener('transitionend', trWait);
    nextStep();
  });


  var fakeCall = {
    addEventListener: function() {},
    answer: function() {},
    hangUp: function() {},
    removeEventListener: function() {},
    state: 'dialing',
    number: '123-4242-4242'
  };

  // Fake an incoming call, and wait for the transition
  window.CallHandler.incoming(fakeCall);
  yield callScreen.addEventListener('transitionend', function trWait() {
    callScreen.removeEventListener('transitionend', trWait);
    nextStep();
  });

  window.CallHandler.answer();
  window.CallHandler.connected();
  window.CallHandler.end();
  window.CallHandler.disconnected();

  // Get the history again and test that two calls have been added
  yield window.Recents.history(function(history) {
    ok(history.length == (initialCount + 2),
       'Calls added to recents history');
    nextStep();
  });

  // Wait for those calls to be added to the document, too
  var recentsView = document.getElementById('recents-view');
  yield until(function() {
    return recentsView.querySelectorAll('.recent').length == initialCount + 2;
  }, nextStep);

  var recents = recentsView.querySelectorAll('.recent');
  ok(recents[0].classList.contains('incoming-connected'),
     'Incoming call displayed');
  ok(recents[1].classList.contains('outgoing-refused'),
     'Outgoing call displayed');
}
