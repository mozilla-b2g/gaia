
function test() {
  waitForExplicitFinish();

  function testAppManagerAndFinish() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    var AppManager = contentWindow.Gaia.AppManager;

    setTimeout(function() {
      AppManager.launch('../settings/settings.html');
      var galleryFrame = AppManager.launch('../gallery/gallery.html');

      waitFor(function() {

        ok(AppManager.runningApps.length == 2, '2 apps launched');
        ok(galleryFrame.classList.contains('active'), 'Gallery on top');

        AppManager.close();
        ok(!galleryFrame.classList.contains('active'), 'Gallery closed');

        AppManager.kill('../gallery/gallery.html');
        ok(AppManager.runningApps.length == 1, 'Only 1 running app left');

        finish();
      }, function() {
        let galleryWindow = galleryFrame.contentWindow;
        return 'Gallery' in galleryWindow;
      });
    }, 300);
  }

  waitFor(testAppManagerAndFinish, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return 'Gaia' in contentWindow;
  });
}
