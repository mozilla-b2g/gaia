
function test() {
  waitForExplicitFinish();
  var url = '../gallery/gallery.html';

  getWindowManager(function(windowManager) {
    var window = content.wrappedJSObject;

    // Check for the existences of the basic windows object
    ok(window.WindowManager, 'No AppWindow');
    ok(window.WindowSprite, 'No WindowSprite');
    ok(window.AppWindow, 'No AppWindow');

    // At the beginning no applications should be running
    ok(windowManager.windows.length === 0, 'No apps running');

    function onReady(frame) {
      ok(windowManager.windows.length === 1, '1 app running');
      ok(frame.classList.contains('active'), 'Gallery on top');

      windowManager.closeForegroundWindow(function() {
        ok(!frame.classList.contains('active'), 'Gallery closed');
      });
    }

    let appFrame = windowManager.launch(url).element;

    let count = 0;
    let events = ['appwillopen', 'appopen', 'appfocus',
                  'appwillclose', 'appclose'];
    events.forEach(function attachEvent(type) {
      appFrame.addEventListener(type, function handler(evt) {
        appFrame.removeEventListener(evt.type, handler, true);
        count++;
      }, true);
    });

    function onClose() {
      windowManager.kill(url);

      ok(count == events.length, 'Some events has not been fired - got ' + count + ' expected ' + events.length);
      ok(windowManager.windows.length === 0, 'No apps running');
      finish();
    }


    ApplicationObserver(appFrame, onReady, onClose);
  });
}

