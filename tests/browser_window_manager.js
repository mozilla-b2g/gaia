
function test() {
  waitForExplicitFinish();
  var url = '../gallery/gallery.html';

  getWindowManager(function(windowManager) {
     ok(windowManager.windows.length === 0, 'No apps running');

    function onReady(frame) {
      ok(windowManager.windows.length === 1, '1 app running');
      ok(frame.classList.contains('active'), 'Gallery on top');

      windowManager.closeForegroundWindow(function() {
        ok(!frame.classList.contains('active'), 'Gallery closed');
      });
    }

    function onClose() {
      windowManager.kill(url);

      ok(windowManager.windows.length === 0, 'No apps running');
      finish();
    }

    let appFrame = windowManager.launch(url).element;
    ApplicationObserver(appFrame, onReady, onClose);
  });
}

