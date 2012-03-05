function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';
  
  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let document = dialerFrame.contentWindow.document;
      function pressKey(button) {
      	var key = document.querySelector(".keyboard-key[data-value='" + button + "']");
      	EventUtils.sendMouseEvent({type: 'mousedown'}, key);
      }
      //declare each of the keys
      function dialNumeric(sequence) {
         for (var i = 0; i < sequence.length; i++) {
         	pressKey(sequence[i]);
         }
      }

      var keyCall = document.querySelector(".keyboard-key[data-value='call']");
	  var keyEnd = document.getElementById('end-call');
	
	  //Having declared the keys, enter the number "15555215556"
	  
      dialNumeric("15555215556");
	  
      //Verify the phone number view contains the correct number
	  ok(document.getElementById('phone-number-view').textContent == '15555215556',
         'Phone number view updated');
      //dial the number
      pressKey("call");
      
      
      //verify that 'end-call' button is created
	  ok(document.getElementById('end-call') != null, "Element exists");

	  //hit 'end-call' button to end the call
      EventUtils.sendMouseEvent({type: 'mousedown'}, keyEnd);
	  
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



