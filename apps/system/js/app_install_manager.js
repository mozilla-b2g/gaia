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

    this.notifContainer =
            document.getElementById('install-manager-notification-container');
    this.installNotifications = {};

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
    var app = e.detail.application,
        manifestURL = app.manifestURL;

    if (app.installState === 'installed') {
      // nothing more to do here, everything is already done
      return;
    }
    StatusBar.incSystemDownloads();
    this.addNotification(app);

    app.ondownloadsuccess = this.handleDownloadSuccess.bind(this);
    app.ondownloaderror = this.handleDownloadError.bind(this);
    app.onprogress = this.handleProgress.bind(this);
  },

  handleDownloadSuccess: function ai_handleDownloadSuccess(evt) {
    var app = evt.application;
    this.finishDownload(app);
  },

  handleDownloadError: function ai_handleDownloadError(evt) {
    var app = evt.application;
    var _ = navigator.mozL10n.get;
    var manifest = app.manifest || app.updateManifest;
    var name = manifest.name;
    StatusBar.decSystemDownloads();
    var msg = name + ' ' + _('download-stopped');
    SystemBanner.show(msg);
    this.finishDownload(app);
  },

  finishDownload: function ai_cleanUp(app) {
    StatusBar.decSystemDownloads();
    this.removeNotification(app);
    app.ondownloadsuccess = null;
    app.ondownloaderror = null;
    app.onprogress = null;
  },

  addNotification: function ai_addNotification(app) {
    // should be unique (this is used already in applications.js)
    var manifestURL = app.manifestURL,
        manifest = app.manifest || app.updateManifest;

    if (this.installNotifications[manifestURL]) {
      return;
    }

    var newNotif =
      '<div class="fake-notification">' +
        '<div class="message"></div>' +
        '<progress></progress>' +
      '</div>';

    this.notifContainer.insertAdjacentHTML('afterbegin', newNotif);

    var newNode = this.notifContainer.firstElementChild;
    var _ = navigator.mozL10n.get;

    var message = _('downloadingAppMessage', {
      appName: manifest.name
    });

    newNode.querySelector('.message').textContent = message;

    var progressNode = newNode.querySelector('progress');

    var size = manifest.size;
    if (size) {
      progressNode.max = size;
      progressNode.value = 0;
      message = _('downloadingAppProgress',
        {
          progress: this.humanizeSize(0),
          max: this.humanizeSize(size)
        });
    } else {
      message = navigator.mozL10n.get(
          'downloadingAppProgressNoMax', { progress: 0 });
    }
    progressNode.textContent = message;

    this.installNotifications[manifestURL] = newNode;
    NotificationScreen.incExternalNotifications();
  },

  handleProgress: function ai_handleProgress(evt) {
    var app = evt.application;
    var notifNode = this.installNotifications[app.manifestURL];

    if (!notifNode) {
      return;
    }

    var progressNode = notifNode.querySelector('progress');
    var message;
    var _ = navigator.mozL10n.get;

    if (isNaN(app.progress) || app.progress == null) {
      // now we get NaN if there is no progress information but let's
      // handle the null and undefined cases as well
      message = _('downloadingAppProgressIndeterminate');
      progressNode.value = undefined; // switch to indeterminate state
    } else if (progressNode.position === -1) {
      // already in indeterminate state, means we have no max
      message = _('downloadingAppProgressNoMax',
                                      { progress: app.progress });
    } else {
      message = _('downloadingAppProgress',
        {
          progress: this.humanizeSize(app.progress),
          max: this.humanizeSize(progressNode.max)
        });
      progressNode.value = app.progress;
    }
    progressNode.textContent = message;
  },

  removeNotification: function ai_removeNotification(app) {
    var manifestURL = app.manifestURL,
        node = this.installNotifications[manifestURL];

    if (!node) {
      return;
    }

    node.parentNode.removeChild(node);
    delete this.installNotifications[manifestURL];
    NotificationScreen.decExternalNotifications();
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

    if (!bytes)
      return '0.00 ' + _(units[0]);

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
