'use strict';
/* global ConfirmDialogHelper, GaiaGrid */

(function(exports) {

  const IDENTIFIER_SEP = '-';

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

  function localizeString(str) {
    var userLang = document.documentElement.lang;

    // We want to make sure that we translate only if we're using
    // a runtime pseudolocale.
    // mozL10n.ctx.qps contains only runtime pseudolocales
    if (navigator.mozL10n &&
        navigator.mozL10n.ctx.qps.indexOf(userLang) !== -1) {
      return navigator.mozL10n.qps[userLang].translate(str);
    }
    return str;
  }

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
      decoratedIconBlob: details && details.decoratedIconBlob
    };

    // Yes this is clobbering all other listeners to the app MozApp
    //      should be in charge here otherwise the icon will be incorrect.
    MOZAPP_EVENTS.forEach(function(type) {
      this.app['on' + type] = this.handleEvent.bind(this);
    }, this);

    // Determine and set the initial state of the app when it is inserted.
    this.setAppState(this._determineState(app));
  }

  /**
  `app.manifest.role`s which should not be displayed on the grid.
  */
  Mozapp.HIDDEN_ROLES = [
    'system', 'input', 'homescreen', 'search', 'addon', 'langpack'
  ];

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
      // is there is a pending download but we cannot download then this app is
      // in an unrecoverable state due to some fatal error.
      if (
        // Must be pending (meaning not launchable)
        app.installState === 'pending' &&
        // Without any option for downloading the app
        !app.downloadAvailable &&
        // And not be currently applying a download
        !app.readyToApplyDownload
      ) {
        return APP_UNRECOVERABLE;
      }

      // If the app is currently downloading life is good and we should display
      // loading.
      if (app.downloading) {
        return APP_LOADING;
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

          window.dispatchEvent(new CustomEvent('downloadapplied', {
            detail: {
              id: this.app.manifestURL
            }
          }));

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

      if (navigator.mozL10n && userLang in navigator.mozL10n.qps) {
        return navigator.mozL10n.qps[userLang].
          translate(this.descriptor.short_name || this.descriptor.name);
      }

      var locales = this.descriptor.locales;
      var localized =
        locales && locales[userLang] &&
        (locales[userLang].short_name || locales[userLang].name);

      return localized || this.descriptor.short_name || this.descriptor.name;
    },

    asyncName: function() {
      var userLang = document.documentElement.lang;

      var ep = this.entryPoint || undefined;

      if (!this.app.getLocalizedValue) {
        return new Promise((resolve, reject) => { reject(); });
      }

      return this.app.getLocalizedValue('short_name', userLang, ep).then(
        shortName => localizeString(shortName),
        this.app.getLocalizedValue.bind(this.app, 'name', userLang, ep)).then(
          name => localizeString(name),
          () => this.name
        );
    },

    /**
     * Returns the icon image path.
     */
    get icon() {
      var icon = this._accurateIcon;

      if (!icon) {
        icon = this._accurateIcon = this.closestIconFromList(
          this.descriptor.icons);
      }

      return icon;
    },

    get descriptor() {
      var manifest = this.app.manifest || this.app.updateManifest;

      if (this.entryPoint && manifest.entry_points &&
        manifest.entry_points[this.entryPoint]) {
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
      navigator.mozApps.mgmt.uninstall(this.app);
    },

    cancel: function() {
      var dialog = new ConfirmDialogHelper({
        type: 'pause',
        title: {id: 'gaia-grid-stop-download-title', args: { name: this.name }},
        body: 'gaia-grid-stop-download-body',
        cancel: {
          title: 'gaia-grid-cancel'
        },
        confirm: {
          title: 'gaia-grid-stop-download-action',
          type: 'danger',
          cb: () =>  this.app.cancelDownload()
        }
      });
      dialog.show(document.body);
    },

    resume: function() {
      var dialog = new ConfirmDialogHelper({
        type: 'resume',
        title: 'gaia-grid-resume-download-title',
        body: {id: 'gaia-grid-resume-download-body', args: { name: this.name }},
        cancel: {
          title: 'gaia-grid-cancel'
        },
        confirm: {
          title: 'gaia-grid-resume-download-action',
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

      switch (this._determineState(app)) {
        case APP_UNRECOVERABLE:
          return this.unrecoverableError();
        case APP_ERROR:
        case APP_PAUSED:
          return this.resume();
        case APP_LOADING:
          return this.cancel();
      }

      var appContext = app.manifestURL
        .replace('app://', '')
        .replace('/manifest.webapp', '');

      window.performance.mark('appLaunch@' + appContext);

      if (this.entryPoint) {
        return app.launch(this.entryPoint);
      }

      // Default action is to launch the app.
      return app.launch();
    }
  };

  exports.GaiaGrid.Mozapp = Mozapp;

}(window));
