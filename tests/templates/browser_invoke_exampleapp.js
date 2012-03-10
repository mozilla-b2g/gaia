//this is a simple template testcase -boilerplate code
//launches  apps, contains placeholder for in-app verifications, closes app

function test() {
  waitForExplicitFinish();
  //specify the path, relative to gaia, where your app resides
  let url = '../exampleapp/exampleapp.html';
  
  //name the variables accordingly
  getWindowManager(function(windowManager) {
    function onReady(exampleappFrame) {
      let exampleappWindow = exampleappFrame.contentWindow;

      // do custom checks here, e.g. check for existence of keyboard view
      //ok(!dialerWindow.document.getElementById('keyboard-view').hidden,
      //   'Contact view displayed');
      
     //next command resumes boilerplate - to eof - for closing window, app, etc.
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
