
(function(global) {
  'use strict';

  // Promise based version of some zip functions.
  function writerAdd(writer, filename, data, func) {
    return new Promise((resolve, reject) => {
      writer.add(filename, new func(data),
        function() {
          resolve();
        },
        function(currentIndex, totalIndex) {
          // onprogress callback, ununsed.
        });
    });
  }

  /**
    * Helper to easily create zips as Blobs.
    * Usage:
    *    var zip = new PackageHelper();
    *    zip.init().then(() => {
    *      zip.addResource('metadata.json', JSON.parse(this._meta));
    *      zip.addResource('application.zip', blob);
    *      zip.asBlob(success, console.error);
    *    }, console.error);
    */
  function PackageHelper() {
    this._writer = null;
  }

  PackageHelper.prototype = {
    init: function() {
      dump('PackageHelper.init()');
      var self = this;
      return new Promise((resolve, reject) => {
        zip.createWriter(new zip.BlobWriter(),
          function(writer) {
            self._writer = writer;
            resolve();
          }, reject);
      })
    },

    addResource: function(path, data) {
      return new Promise((resolve, reject) => {
        if (!this._writer) {
          reject();
        }
        var func = typeof data === 'object' ? zip.BlobReader : zip.TextReader;
        writerAdd(this._writer, path,  data, func).then(resolve, reject);
      });
    },

    asBlob: function() {
      return new Promise((resolve, reject) => {
        this._writer.close(function(blob) {
          // blob contains the zip file as a Blob object
          resolve(blob);
        });
      });
    }
  };

  /**
    * Helper to create an exportable app Blob.
    */
  function AppZip() {
    this._meta = null;
    this._package = null;
    this._manifest = null;
  }

  AppZip.prototype = {

    // Meta is a JSON object like:
    //  {
    //    installOrigin: ...,
    //    manifestURL: ...,
    //    version: 1
    //  };
    set metaData(meta) {
      if (meta &&
          meta.installOrigin &&
          meta.manifestURL &&
          meta.version == 1) {
        this._meta = meta;
      }
    },

    // Package needs to be a zip blob.
    set packageblob(pack) {
      this._package = pack;
    },

    // The JSON manifest. For hosted apps this is the app manifest, for
    // packaged apps this is the mini manifest.
    set manifest(manifest) {
      this._manifest = manifest;
    },

    // Returns a Promise that resolves to a Blob that can be imported as an
    // app.
    asBlob: function() {
      return new Promise((resolve, reject) => {
        if (!this._meta) {
          reject('NoMetaData');
          return;
        }

        if (!this._manifest) {
          reject('NoManifest');
          return;
        }

        var manifestPath = this._package ? 'update.webapp' : 'manifest.webapp';
        var zip = new PackageHelper();
        var self = this;
        zip.init().then(() => {
          function addMeta() {
            return zip.addResource('metadata.json', JSON.stringify(self._meta));
          }

          function addManifest() {
            return zip.addResource(manifestPath, JSON.stringify(self._manifest));
          }

          function addPackage() {
            if (self._package) {
              return zip.addResource('application.zip', self._package);
            } else {
              return new Promise((resolve, reject) => {
                resolve();
              });
            }
          }

          return addMeta().then(addManifest)
                          .then(addPackage)
                          .then(zip.asBlob.bind(zip))
                          .then(resolve);
        }, reject);
      });
    }
  };

  global.PackageHelper = PackageHelper;
  global.AppZip = AppZip;
})(window);
