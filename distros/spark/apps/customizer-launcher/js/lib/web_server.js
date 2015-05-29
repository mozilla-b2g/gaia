define(["exports", "components/fxos-web-server/dist/fxos-web-server"], function (exports, _componentsFxosWebServerDistFxosWebServer) {
  "use strict";

  var WebServer = (function () {
    var WebServer = function WebServer() {
      var _this = this;
      this.lastLaunchedManifestURL = null;
      if (!this.httpServer) {
        this.httpServer = new HTTPServer(3215);
      }

      this.httpServer.addEventListener("request", function (evt) {
        var request = evt.request;
        var response = evt.response;
        response.headers["Access-Control-Allow-Origin"] = "*";

        if (request.path === "/request") {
          response.send(_this.lastLaunchedManifestURL);
          return;
        }

        if (request.path === "/confirm") {
          var url = (request.params && request.params.url) || "";
          if (url && url === _this.lastLaunchedManifestURL) {
            response.send("STOP_SERVER_INVOKED");
            _this.stopServer();
            return;
          }
        }
      });
    };

    WebServer.prototype.setData = function (url) {
      this.lastLaunchedManifestURL = url;
    };

    WebServer.prototype.startServer = function () {
      var _this2 = this;
      return new Promise(function (resolve, reject) {
        _this2.httpServer.start();
        console.log("WebServer Started");
        resolve(true);
      });
    };

    WebServer.prototype.stopServer = function () {
      if (!this.httpServer) {
        return;
      }
      this.httpServer.stop();
      this.lastLaunchedManifestURL = null;
      console.log("WebServer Stopped");
    };

    return WebServer;
  })();

  exports["default"] = WebServer;
});