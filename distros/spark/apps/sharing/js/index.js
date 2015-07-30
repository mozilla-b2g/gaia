define(["exports", "app/js/globals", "app/js/controllers/main_controller"], function (exports, _appJsGlobals, _appJsControllersMainController) {
  "use strict";

  var MainController = _appJsControllersMainController["default"];


  var mainController = new MainController();
  mainController.main();

  // Generate a pseudo-GUID for this session.
  window.session = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = window.crypto.getRandomValues(new Uint32Array(1))[0] % 16, v = c == "x" ? r : (r & 3 | 8);
    return v.toString(16);
  });
});