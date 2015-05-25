define(["exports"], function (exports) {
  "use strict";

  var _extends = function (child, parent) {
    child.prototype = Object.create(parent.prototype, {
      constructor: {
        value: child,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    child.__proto__ = parent;
  };

  var AddonMerger = (function (Model) {
    var AddonMerger = function AddonMerger(properties) {
      Model.call(this, properties);

      this.blobs = [];

      this.id = this.id || ("addon" + Math.round(Math.random() * 100000000));
      this.name = this.name || this.id;

      this.packageMetadata = {
        installOrigin: "http://gaiamobile.org",
        manifestURL: "app://" + this.id + ".gaiamobile.org/update.webapp",
        version: 1
      };

      this.packageManifest = {
        name: this.name,
        package_path: "/application.zip"
      };

      this.manifest = {
        name: this.name,
        role: "addon",
        type: "certified",
        origin: "app://" + this.id + ".gaiamobile.org"
      };
    };

    _extends(AddonMerger, Model);

    AddonMerger.prototype.merge = function (callback) {
      var _this = this;
      if (typeof callback !== "function") {
        return;
      }

      var scripts = [];
      var error = false;

      this.blobs.forEach(function (blob) {
        blobToArrayBuffer(blob, function (arrayBuffer) {
          if (error) {
            return;
          }

          var zip = new JSZip();
          zip.load(arrayBuffer);

          var applicationZipFile = zip.file("application.zip");
          if (!applicationZipFile) {
            error = true;
            callback();
            return;
          }

          var applicationZip = new JSZip();
          applicationZip.load(applicationZipFile.asArrayBuffer());

          var scriptFile = applicationZip.file("main.js");
          if (!scriptFile) {
            error = true;
            callback();
            return;
          }

          scripts.push(scriptFile.asText());

          if (scripts.length === _this.blobs.length) {
            callback(bundle(_this, scripts.join("\n")));
          }
        });
      });
    };

    AddonMerger.prototype.add = function (blob) {
      this.blobs.push(blob);
    };

    return AddonMerger;
  })(Model);

  exports["default"] = AddonMerger;


  function bundle(merger, script) {
    var applicationZip = new JSZip();
    applicationZip.file("manifest.webapp", JSON.stringify(merger.manifest));
    applicationZip.file("main.js", script);

    var packageZip = new JSZip();
    packageZip.file("metadata.json", JSON.stringify(merger.packageMetadata));
    packageZip.file("update.webapp", JSON.stringify(merger.packageManifest));
    packageZip.file("application.zip", applicationZip.generate({ type: "arraybuffer" }));

    return packageZip.generate({ type: "arraybuffer" });
  }

  function blobToArrayBuffer(blob, callback) {
    var fileReader = new FileReader();
    fileReader.onload = function () {
      if (typeof callback === "function") {
        callback(fileReader.result);
      }
    };
    fileReader.readAsArrayBuffer(blob);

    return fileReader.result;
  }
});