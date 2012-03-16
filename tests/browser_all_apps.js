function generatorTest() {
  requestLongerTimeout(3); // We may need > 60s to open and close all apps

  // Wait until the content document is ready
  yield until(
    function() content.wrappedJSObject.document.readyState === 'complete',
    nextStep);

  // Find all the icons on the homescreen
  let contentWin = content.wrappedJSObject;
  let contentDoc = contentWin.document;
  let icons = contentDoc.querySelectorAll('#apps > .page > .icon');

  // Loop through them all and launch and then kill each of the apps
  for (let i = 0; i < icons.length; i++) {
    let url = icons[i].dataset.url;
    yield testApp(url, function(window, document, nextStep) {
      ok(document, 'app launched from ' + url);
    });
  }
}
