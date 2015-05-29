define(["exports"], function (exports) {
  "use strict";

  /* globals requirejs */

  requirejs.config({
    baseUrl: "components",
    paths: { app: "../" }
  });

  requirejs(["app/js/index"]);
});