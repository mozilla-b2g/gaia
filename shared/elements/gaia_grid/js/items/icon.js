'use strict';
/* global GridItem */
/* global UrlHelper */
/* global Promise */

(function(exports) {

  const IDENTIFIER_SEP = '-';

  /**
   * Represents  single app icon on the homepage.
   */
  function Icon(app, entryPoint, details) {
    this.app = app;
    this.entryPoint = entryPoint;

    this.detail = {
      type: 'app',
      manifestURL: app.manifestURL,
      entryPoint: entryPoint,
      index: 0,
      // XXX: Somewhat ugly hack around the constructor args
      defaultIconBlob: details && details.defaultIconBlob
    };

    // Re-render on update
    // XXX: This introduces a potential race condition. GridItem.renderIcon is
    // not concurrency safe one image may override another without ordering.
    this.app.ondownloadapplied = GridItem.prototype.renderIcon.bind(this);
  }

  Icon.prototype = {

    __proto__: GridItem.prototype,

    /**
     * Returns the height in pixels of each icon.
     */
    get pixelHeight() {
      return this.grid.layout.gridItemHeight;
    },

    /**
     * Width in grid units for each icon.
     */
    gridWidth: 1,

    get name() {
      var userLang = document.documentElement.lang;

      var locales = this.descriptor.locales;
      var localized = locales && locales[userLang] && locales[userLang].name;

      return localized || this.descriptor.name;
    },

    _icon: function() {
      var icons = this.descriptor.icons;
      if (!icons) {
        return this.defaultIcon;
      }

      // Create a list with the sizes and order it by descending size
      var list = Object.keys(icons).map(function(size) {
        return size;
      }).sort(function(a, b) {
        return b - a;
      });

      var length = list.length;
      if (length === 0) {
        // No icons -> icon by default
        return this.defaultIcon;
      }

      var maxSize = this.grid.layout.gridMaxIconSize; // The goal size
      var accurateSize = list[0]; // The biggest icon available
      for (var i = 0; i < length; i++) {
        var size = list[i];

        if (size < maxSize) {
          break;
        }

        accurateSize = size;
      }

      var icon = icons[accurateSize];

      // Handle relative URLs
      if (!UrlHelper.hasScheme(icon)) {
        var a = document.createElement('a');
        a.href = this.app.origin;
        icon = a.protocol + '//' + a.host + icon;
      }

      return icon;
    },

    /**
     * Returns the icon image path.
     */
    get icon() {
      var icon = this.accurateIcon;

      if (!icon) {
        icon = this.accurateIcon = this._icon();
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

    identifierSeparator: IDENTIFIER_SEP,

    get identifier() {
      var identifier = [this.app.manifestURL];

      if (this.entryPoint) {
        identifier.push(this.entryPoint);
      }

      return identifier.join(IDENTIFIER_SEP);
    },

    /**
     * Returns true if this app is removable.
     */
    isRemovable: function() {
      return this.app.removable;
    },

    fetchIconBlob: function() {
      var _super = GridItem.prototype.fetchIconBlob.bind(this);
      if (!this.app.downloading) {
        return _super();
      }

      // show the spinner while the app is downloading!
      this.showDownloading();
      this.app.onprogress = this.showDownloading.bind(this);

      // XXX: This is not safe if some upstream consumer wanted to listen to
      //      these events we just clobbered them.
      return new Promise((accept, reject) => {
        this.app.ondownloadsuccess = this.app.ondownloaderror = () => {
          _super().
            then((blob) => {
              this.hideDownloading();
              accept(blob);
            }).
            catch((e) => {
              this.hideDownloading();
              reject(e);
            });
        };
      });
    },

    /**
     * Resolves click action.
     */
    launch: function() {
      var app = this.app;
      if (app.downloading) {
        window.dispatchEvent(
          new CustomEvent('gaiagrid-cancel-download-mozapp', {
            'detail': this
          })
        );
      } else if (app.downloadAvailable) {
        window.dispatchEvent(
          new CustomEvent('gaiagrid-resume-download-mozapp', {
            'detail': this
          })
        );
      } else if (this.entryPoint) {
        app.launch(this.entryPoint);
      } else {
        app.launch();
      }
    },

    /**
     * Uninstalls the application.
     */
    remove: function() {
      window.dispatchEvent(new CustomEvent('gaiagrid-uninstall-mozapp', {
        'detail': this
      }));
    },

    showDownloading: function() {
      this.element.classList.add('loading');
    },

    hideDownloading: function() {
      this.element.classList.remove('loading');
    }
  };

  exports.Icon = Icon;

}(window));
