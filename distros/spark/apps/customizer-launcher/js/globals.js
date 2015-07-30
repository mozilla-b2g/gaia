define(["exports"], function (exports) {
  "use strict";

  window.COMPONENTS_BASE_URL = "./components/";
  window.DEFAULT_ICON_URL = "./img/default_icon.png";
  require.config({
    baseUrl: "/",
    paths: {
      "gaia-component": "components/gaia-component/gaia-component"
    }
  });
});