
function test() {
  waitForExplicitFinish();

  appTest(function(appManager) {
    appManager.launch('../settings/settings.html');
    var galleryFrame = appManager.launch('../gallery/gallery.html');

    waitFor(function() {

      ok(appManager.runningApps.length == 2, '2 apps launched');
      ok(galleryFrame.classList.contains('active'), 'Gallery on top');

      appManager.close();
      ok(!galleryFrame.classList.contains('active'), 'Gallery closed');

      appManager.kill('../gallery/gallery.html');
      ok(appManager.runningApps.length == 1, 'Only 1 running app left');

      finish();
    }, function() {
      let galleryWindow = galleryFrame.contentWindow;
      return 'Gallery' in galleryWindow;
    });
  });
}
