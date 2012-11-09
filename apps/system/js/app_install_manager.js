'use strict';

var AppInstallManager = {

  init: function ai_init() {
    this.dialog = document.getElementById('app-install-dialog');
    this.msg = document.getElementById('app-install-message');
    this.size = document.getElementById('app-install-size');
    this.authorName = document.getElementById('app-install-author-name');
    this.authorUrl = document.getElementById('app-install-author-url');
    this.installButton = document.getElementById('app-install-install-button');
    this.cancelButton = document.getElementById('app-install-cancel-button');
    this.cancelDialog = document.getElementById('app-install-cancel-dialog');
    this.confirmCancelButton =
      document.getElementById('app-install-confirm-cancel-button');
    this.resumeButton = document.getElementById('app-install-resume-button');

    window.addEventListener('mozChromeEvent',
      (function ai_handleChromeEvent(e) {
      if (e.detail.type == 'webapps-ask-install') {
        this.handleAppInstallPrompt(e.detail);
      }
    }).bind(this));

    window.addEventListener('applicationinstall',
      this.handleApplicationInstall.bind(this));


    this.installButton.onclick = this.handleInstall.bind(this);
    this.cancelButton.onclick = this.showCancelDialog.bind(this);
    this.confirmCancelButton.onclick = this.handleCancel.bind(this);
    this.resumeButton.onclick = this.hideCancelDialog.bind(this);
  },

  handleAppInstallPrompt: function ai_handleInstallPrompt(detail) {
    var _ = navigator.mozL10n.get;
    var app = detail.app;
    // updateManifest is used by packaged apps until they are installed
    var manifest = app.manifest ? app.manifest : app.updateManifest;

    if (!manifest)
      return;

    this.dialog.classList.add('visible');

    var id = detail.id;

    if (manifest.size) {
      this.size.textContent = this.humanizeSize(manifest.size);
    } else {
      this.size.textContent = _('unknown');
    }

    // Get localised name or use default
    var name = manifest.name;
    var locales = manifest.locales;
    var lang = navigator.language;
    if (locales && locales[lang] && locales[lang].name)
      name = locales[lang].name;
    var msg = _('install-app', {'name': name});
    this.msg.textContent = msg;

    if (manifest.developer) {
      this.authorName.textContent = manifest.developer.name;
      this.authorUrl.textContent = manifest.developer.url;
    } else {
      this.authorName.textContent = _('unknown');
      this.authorUrl.textContent = '';
    }

    this.installCallback = (function ai_installCallback() {
      this.dispatchResponse(id, 'webapps-install-granted');
    }).bind(this);

    this.cancelCallback = (function ai_cancelCallback() {
      this.dispatchResponse(id, 'webapps-install-denied');
    }).bind(this);

  },

  handleInstall: function ai_handleInstall(evt) {
    if (evt)
      evt.preventDefault();
    if (this.installCallback)
      this.installCallback();
    this.installCallback = null;
    this.dialog.classList.remove('visible');
  },

  handleApplicationInstall: function ai_handleApplicationInstall(e) {
    var app = e.detail.application;

    // take care that these manifests can have different properties
    var manifest = app.manifest || app.updateManifest;

    if (app.installState === 'installed') {
      // nothing more to do here, everything is already done
      return;
    }
    StatusBar.incSystemDownloads();

    app.ondownloadsuccess = this.handleDownloadSuccess.bind(this, app);
    app.ondownloaderror = this.handleDownloadError.bind(this, app);
  },

  handleDownloadSuccess: function ai_handleDownloadSuccess(app, evt) {
    var manifest = app.manifest || app.updateManifest;
    StatusBar.decSystemDownloads();
    this.cleanUp(app);
  },

  handleDownloadError: function ai_handleDownloadError(app, evt) {
    var _ = navigator.mozL10n.get;
    var manifest = app.manifest || app.updateManifest;
    var name = manifest.name;
    StatusBar.decSystemDownloads();
    var msg = name + ' ' + _('download-stopped');
    SystemBanner.show(msg);
    this.cleanUp(app);
  },

  cleanUp: function ai_cleanUp(app) {
    app.ondownloadsuccess = null;
    app.ondownloaderror = null;
    app.onprogress = null;
  },

  dispatchResponse: function ai_dispatchResponse(id, type) {
    var event = document.createEvent('CustomEvent');

    event.initCustomEvent('mozContentEvent', true, true, {
      id: id,
      type: type
    });

    window.dispatchEvent(event);
  },

  humanizeSize: function ai_humanizeSize(bytes) {
    var _ = navigator.mozL10n.get;
    var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
    var e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(e))).toFixed(2) + ' ' +
      _(units[e]);
  },

  showCancelDialog: function ai_showCancelDialog(evt) {
    if (evt)
      evt.preventDefault();
    this.cancelDialog.classList.add('visible');
    this.dialog.classList.remove('visible');
  },

  hideCancelDialog: function ai_hideCancelDialog(evt) {
    if (evt)
      evt.preventDefault();
    this.dialog.classList.add('visible');
    this.cancelDialog.classList.remove('visible');
  },

  handleCancel: function ai_handleCancel() {
    if (this.cancelCallback)
      this.cancelCallback();
    this.cancelCallback = null;
    this.cancelDialog.classList.remove('visible');
  }

};

AppInstallManager.init();
