function test() {
  waitForExplicitFinish();
  let url = '../dialer/dialer.html';
  
  getWindowManager(function(windowManager) {
    function onReady(dialerFrame) {
      let document = dialerFrame.contentWindow.document;

      //declare each of the keys
      var key1 = document.querySelector(".keyboard-key[data-value='1']");
      var key2 = document.querySelector(".keyboard-key[data-value='2']");
      var key3 = document.querySelector(".keyboard-key[data-value='3']");
      var key4 = document.querySelector(".keyboard-key[data-value='4']");
      var key5 = document.querySelector(".keyboard-key[data-value='5']");
      var key6 = document.querySelector(".keyboard-key[data-value='6']");
      var key7 = document.querySelector(".keyboard-key[data-value='7']");
      var key8 = document.querySelector(".keyboard-key[data-value='8']");
      var key9 = document.querySelector(".keyboard-key[data-value='9']");
      var key0 = document.querySelector(".keyboard-key[data-value='0']");
      var keyCall = document.querySelector(".keyboard-key[data-value='call']");
	  var keyEnd = document.getElementById('end-call');
	
	  //Having declared the keys, enter the number "15555215556"
      EventUtils.sendMouseEvent({type: 'mousedown'}, key1);
	  EventUtils.sendMouseEvent({type: 'mousedown'}, key5);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key5);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key5);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key5);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key2);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key1);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key5);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key5);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key5);
      EventUtils.sendMouseEvent({type: 'mousedown'}, key6);
	  
      //Verify the phone number view contains the correct number
	  ok(document.getElementById('phone-number-view').textContent == '15555215556',
         'Phone number view updated');
      
      //dial the number
      EventUtils.sendMouseEvent({type: 'mousedown'}, keyCall);
      
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



