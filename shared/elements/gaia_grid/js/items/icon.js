'use strict';
/* global GridItem */
/* global UrlHelper */

(function(exports) {

  var _ = navigator.mozL10n.get;

  const ICON_PATH_BY_DEFAULT = 'style/images/default_icon.png';

  const CONFIRM_DIALOG_ID = 'confirmation-message';

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

    app.ondownloadapplied = function(event) {
      this.displayIcon();
    }.bind(this);
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
      var name = this.descriptor.name;
      var userLang = document.documentElement.lang;

      if (name[userLang]) {
        return name[userLang];
      }
      return name;
    },

    _icon: function() {
      var icons = this.descriptor.icons;
      if (!icons) {
        return ICON_PATH_BY_DEFAULT;
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
        return ICON_PATH_BY_DEFAULT;
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

    get identifier() {
      var identifier = [this.app.manifestURL];

      if (this.entryPoint) {
        identifier.push(this.entryPoint);
      }

      return identifier.join('-');
    },

    /**
     * Returns true if this app is removable.
     */
    isRemovable: function() {
      return this.app.removable;
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
    },

    /**
     * Uninstalls the application.
     */
    remove: function() {
      var nameObj = {
        name: this.name
      };

      var title = document.getElementById(CONFIRM_DIALOG_ID + '-title');
      title.textContent = _('delete-title', nameObj);

      var body = document.getElementById(CONFIRM_DIALOG_ID + '-body');
      body.textContent = _('delete-body', nameObj);

      var dialog = document.getElementById(CONFIRM_DIALOG_ID);
      var cancelButton = document.getElementById(CONFIRM_DIALOG_ID + '-cancel');
      var deleteButton = document.getElementById(CONFIRM_DIALOG_ID + '-delete');

      var app = this.app;
      var handler = {
        handleEvent: function(e) {
          if (e.type === 'click' && e.target === deleteButton) {
            navigator.mozApps.mgmt.uninstall(app);
          }

          window.removeEventListener('hashchange', handler);
          cancelButton.removeEventListener('click', handler);
          deleteButton.removeEventListener('click', handler);
          dialog.setAttribute('hidden', '');
        }
      };

      cancelButton.addEventListener('click', handler);
      deleteButton.addEventListener('click', handler);
      window.addEventListener('hashchange', handler);

      dialog.removeAttribute('hidden');
    }
  };

  exports.Icon = Icon;

}(window));
