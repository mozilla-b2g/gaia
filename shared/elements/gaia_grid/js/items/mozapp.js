'use strict';
/* global ConfirmDialogHelper, GaiaGrid, UrlHelper */

(function(exports) {

  const IDENTIFIER_SEP = '-';

  var _ = navigator.mozL10n.get;

  var MOZAPP_EVENTS = [
    'downloadsuccess',
    'downloaderror',
    'downloadavailable',
    'downloadapplied',
    'progress'
  ];

  var APP_LOADING = 'loading';
  var APP_ERROR = 'error';
  var APP_UNRECOVERABLE = 'unrecoverable';
  var APP_PAUSED = 'paused';
  var APP_READY = 'ready';

  /**
   * Represents  single app icon on the homepage.
   */
  function Mozapp(app, entryPoint, details) {
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

    // Yes this is clobbering all other listeners to the app MozApp
    //      should be in charge here otherwise the icon will be incorrect.
    MOZAPP_EVENTS.forEach(function(type) {
      this.app['on' + type] = this;
    }, this);

    // Determine and set the initial state of the app when it is inserted.
    this.setAppState(this._determineState(app));
  }

  /**
  `app.manifest.role`s which should not be displayed on the grid.
  */
  Mozapp.HIDDEN_ROLES = ['system', 'input', 'homescreen', 'search'];

  Mozapp.prototype = {

    __proto__: GaiaGrid.GridItem.prototype,


    /**
    Determine if this application is supposed to be hidden.

    @return Boolean
    */
    _isHiddenRole: function() {
      var manifest = this.app.manifest;

      // don't know what the role is so it is not hidden
      if (!manifest || !manifest.role) {
        return null;
      }

      // if it is in the hidden role list return true
      return Mozapp.HIDDEN_ROLES.indexOf(manifest.role) !== -1;
    },

    /**
    Figure out which state the app is in
    */
    _determineState: function(app) {
      if (app.downloading) {
        return APP_LOADING;
      }

      // Bug 1027491 - work around the fact that downloadError is not cleared
      if (app.installState === 'installed') {
        return APP_READY;
      }

      // is there is a pending download but we cannot download then this app is
      // in an unrecoverable state due to some fatal error.
      if (app.installState === 'pending' && !app.downloadAvailable) {
        return APP_UNRECOVERABLE;
      }

      // Bug 1027347 - downloadError is always present even if there is no error
      //               so we check both for the error and that the error has a
      //               name.
      if (app.downloadError && app.downloadError.name) {

        // If the app was paused while the homescreen was running the
        // downloaderror event will fire with the DOWNLOAD_CANCELED error.
        if (app.downloadError.name === 'DOWNLOAD_CANCELED') {
          return APP_PAUSED;
        }

        return APP_ERROR;
      }

      // Note that this logic is correct because app.downloading is caught above
      // separately.
      if (app.installState === 'pending') {
        return APP_PAUSED;
      }

      return APP_READY;
    },

    handleEvent: function(event) {
      switch (event.type) {
        case 'progress':
        case 'downloaderror':
        case 'downloadsuccess':
          this.setAppState(this._determineState(this.app));
          break;

        case 'downloadapplied':
          // Ensure that a hidden app has not somehow been added to the grid...
          if (this._isHiddenRole()) {
            console.warn('Removing hidden app from the grid', this.name);
            return this.removeFromGrid();
          }

          // we may have updated icons so recalculate the correct icon.
          delete this._accurateIcon;

          // Need to set app state here to correctly handle the pause/resume
          // case.
          this.setAppState(this._determineState(this.app));
          // XXX: This introduces a potential race condition.
          // GridItem.renderIcon is not concurrency safe one image may override
          // another without ordering.
          this.renderIcon();
          break;
      }
    },

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

      // Create a list with the sizes and order it by descending size.
      var list = Object.keys(icons).map(function(size) {
        return size;
      }).sort(function(a, b) {
        return b - a;
      });

      var length = list.length;
      if (length === 0) {
        // No icons -> icon by default.
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
      var icon = this._accurateIcon;

      if (!icon) {
        icon = this._accurateIcon = this._icon();
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

    /**
    Show a dialog to handle unrecoverable errors.
    */
    unrecoverableError: function() {
      var dialog = new ConfirmDialogHelper({
        type: 'unrecoverable',
        title: _('gaia-grid-unrecoverable-error-title'),
        body: _('gaia-grid-unrecoverable-error-body'),
        confirm: {
          title: _('gaia-grid-unrecoverable-error-action'),
          cb: () =>  {
            // XXX: this means whoever uses gaia-grid must have the
            //      webapps-manage permission
            navigator.mozApps.mgmt.uninstall(this.app);
          }
        }
      });
      dialog.show(document.body);
    },

    cancel: function() {
      var dialog = new ConfirmDialogHelper({
        type: 'pause',
        title: _('gaia-grid-stop-download-title', { name: this.name }),
        body: _('gaia-grid-stop-download-body'),
        cancel: {
          title: _('gaia-grid-cancel')
        },
        confirm: {
          title: _('gaia-grid-stop-download-action'),
          type: 'danger',
          cb: () =>  this.app.cancelDownload()
        }
      });
      dialog.show(document.body);
    },

    resume: function() {
      var dialog = new ConfirmDialogHelper({
        type: 'resume',
        title: _('gaia-grid-resume-download-title'),
        body: _('gaia-grid-resume-download-body', { name: this.name }),
        cancel: {
          title: _('gaia-grid-cancel')
        },
        confirm: {
          title: _('gaia-grid-resume-download-action'),
          cb: () => {
            // enter the loading state optimistically
            this.setAppState(APP_LOADING);
            this.app.download();
          }
        }
      });
      dialog.show(document.body);
    },

    setAppState: function(state) {
      this.appState = state;

      if (this.element) {
        this.element.dataset.appState = state;
      }
    },

    render: function() {
      // If there is no element before we can render we need to update the
      // app state. Render may also be called to reposition elements.
      var needsStateSet = !this.element;

      GaiaGrid.GridItem.prototype.render.apply(this, arguments);

      if (needsStateSet) {
        // ensure the newly rendered item has an app state
        this.setAppState(this.appState);
      }
    },

    /**
     * Resolves click action.
     */
    launch: function() {
      var app = this.app;

      // Allow the user to pause a ongoing download.
      if (app.downloading) {
        return this.cancel();
      }

      // If there is a download pending ask to resume it.
      if (app.downloadAvailable) {
        return this.resume();
      }

      // Let the user cleanup any failed installs that cannot be retried.
      if (app.installState == 'pending' && !app.downloadAvailable) {
        return this.unrecoverableError();
      }

      if (this.entryPoint) {
        return app.launch(this.entryPoint);
      }

      // Default action is to launch the app.
      return app.launch();
    }
  };

  exports.GaiaGrid.Mozapp = Mozapp;

}(window));
