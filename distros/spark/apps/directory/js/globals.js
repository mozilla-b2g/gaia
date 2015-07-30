define(["exports"], function (exports) {
  "use strict";

  window.COMPONENTS_BASE_URL = "./components/";
  window.DEFAULT_ICON_URL = "./img/default_icon.png";
  require.config({
    baseUrl: "/",
    paths: {
      "gaia-dialog": "components/gaia-dialog/gaia-dialog",
      "gaia-component": "components/gaia-component/gaia-component",
      "gaia-icons": "components/gaia-icons/gaia-icons"
    }
  });
});