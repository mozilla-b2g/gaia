'use strict';
/* global GridItem */
/* global UrlHelper */

(function(exports) {

  /**
   * Represents a single app icon on the homepage.
   */
  function Icon(app, entryPoint) {
    this.app = app;
    this.entryPoint = entryPoint;

    this.detail = {
      type: 'app',
      manifestURL: app.manifestURL,
      entryPoint: entryPoint,
      index: 0
    };
  }

  Icon.prototype = {

    __proto__: GridItem.prototype,

    /**
     * Returns the height in pixels of each icon.
     */
    get pixelHeight() {
      return app.zoom.gridItemHeight;
    },

    /**
     * Width in grid units for each icon.
     */
    gridWidth: 1,

    get name() {
      var name = this.descriptor.name;
      var userLang = document.documentElement.lang;

      if (name[userLang]) {
        return name[userLang];
      }
      return name;
    },

    get icon() {
      if (!this.descriptor.icons) {
        return '';
      }

      var lastIcon = 0;
      for (var i in this.descriptor.icons) {
        if (i > lastIcon) {
          lastIcon = i;
        }
      }

      var icon = this.descriptor.icons[lastIcon];

      // Handle relative URLs
      if (!UrlHelper.hasScheme(icon)) {
        var a = document.createElement('a');
        a.href = this.app.origin;
        icon = a.protocol + '//' + a.host + icon;
      }

      return icon;
    },

    get descriptor() {
      var manifest = this.app.manifest || this.app.updateManifest;

      if (this.entryPoint) {
        return manifest.entry_points[this.entryPoint];
      }
      return manifest;
    },

    get identifier() {
      var identifier = [this.app.manifestURL];

      if (this.entryPoint) {
        identifier.push(this.entryPoint);
      }

      return identifier.join('-');
    },

    /**
     * Launches the application for this icon.
     */
    launch: function() {
      if (this.entryPoint) {
        this.app.launch(this.entryPoint);
      } else {
        this.app.launch();
      }
    }
  };

  exports.Icon = Icon;

}(window));
