
function test() {
  waitForExplicitFinish();

  function testWindowManagerAndFinish() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    var WindowManager = contentWindow.Gaia.WindowManager;
    var windows = WindowManager.windows;

    setTimeout(function() {
      var existingWindows = [];
      var i;
      
      for (i = 0; i < windows.length; i++) {
        existingWindows.push(windows[i]);
      }
      
      for (i = 0; i < existingWindows.length; i++) {
        WindowManager.kill(existingWindows[i].app.url);
      }
      
      ok(WindowManager.windows.length === 0, 'No apps running');
      
      var galleryFrame = WindowManager.launch('../gallery/gallery.html').element;

      waitFor(function() {

        ok(WindowManager.windows.length === 1, '1 app running');
        ok(galleryFrame.classList.contains('active'), 'Gallery on top');

        var isCloseComplete = false;
        
        WindowManager.closeForegroundWindow(function() {
          isCloseComplete = true;
        });
        
        waitFor(function() {
          ok(!galleryFrame.classList.contains('active'), 'Gallery closed');
        }, function() {
          return isCloseComplete;
        });

        WindowManager.kill('../gallery/gallery.html');
        ok(WindowManager.windows.length === 0, 'No apps running');

        finish();
      }, function() {
        let galleryWindow = galleryFrame.contentWindow;
        return 'Gallery' in galleryWindow;
      });
    }, 300);
  }

  waitFor(testWindowManagerAndFinish, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return 'Gaia' in contentWindow && 'WindowManager' in contentWindow.Gaia;
  });
}
