'use strict';

var AppInstallManager = {
  mapDownloadErrorsToMessage: {
    'NETWORK_ERROR': 'download-failed',
    'DOWNLOAD_ERROR': 'download-failed',
    'MISSING_MANIFEST': 'install-failed',
    'INVALID_MANIFEST': 'install-failed',
    'INSTALL_FROM_DENIED': 'install-failed',
    'INVALID_SECURITY_LEVEL': 'install-failed',
    'INVALID_PACKAGE': 'install-failed',
    'APP_CACHE_DOWNLOAD_ERROR': 'download-failed'
  },

  init: function ai_init() {
    this.dialog = document.getElementById('app-install-dialog');
    this.msg = document.getElementById('app-install-message');
    this.size = document.getElementById('app-install-size');
    this.authorName = document.getElementById('app-install-author-name');
    this.authorUrl = document.getElementById('app-install-author-url');
    this.installButton = document.getElementById('app-install-install-button');
    this.cancelButton = document.getElementById('app-install-cancel-button');
    this.imeLayoutDialog = document.getElementById('ime-layout-dialog');
    this.imeListTemplate = document.getElementById('ime-list-template');
    this.imeList = document.getElementById('ime-list');
    this.imeCancelButton = document.getElementById('ime-cancel-button');
    this.imeConfirmButton = document.getElementById('ime-confirm-button');
    this.setupCancelButton =
      document.getElementById('setup-cancel-button');
    this.setupConfirmButton =
      document.getElementById('setup-confirm-button');

    this.installCancelDialog =
      document.getElementById('app-install-cancel-dialog');
    this.downloadCancelDialog =
      document.getElementById('app-download-cancel-dialog');
    this.setupInstalledAppDialog =
      document.getElementById('setup-installed-app-dialog');
    this.confirmCancelButton =
      document.getElementById('app-install-confirm-cancel-button');
    this.setupAppName = document.getElementById('setup-app-name');
    this.setupAppDescription = document.getElementById('setup-app-description');

    this.resumeButton = document.getElementById('app-install-resume-button');

    this.notifContainer =
            document.getElementById('install-manager-notification-container');
    this.appInfos = {};
    this.setupQueue = [];
    this.isSetupInProgress = false;
    window.addEventListener('mozChromeEvent',
      (function ai_handleChromeEvent(e) {
      if (e.detail.type == 'webapps-ask-install') {
        this.handleAppInstallPrompt(e.detail);
      }
    }).bind(this));

    window.addEventListener('applicationinstall',
      this.handleApplicationInstall.bind(this));

    window.addEventListener('applicationuninstall',
      this.handleApplicationUninstall.bind(this));

    this.installButton.onclick = this.handleInstall.bind(this);
    this.cancelButton.onclick = this.showInstallCancelDialog.bind(this);
    this.confirmCancelButton.onclick = this.handleInstallCancel.bind(this);
    this.resumeButton.onclick = this.hideInstallCancelDialog.bind(this);
    this.notifContainer.onclick = this.showDownloadCancelDialog.bind(this);

    this.downloadCancelDialog.querySelector('.confirm').onclick =
      this.handleConfirmDownloadCancel.bind(this);
    this.downloadCancelDialog.querySelector('.cancel').onclick =
      this.handleCancelDownloadCancel.bind(this);

    this.setupCancelButton.onclick = this.handleSetupCancelAction.bind(this);
    this.setupConfirmButton.onclick =
                             this.handleSetupConfirmAction.bind(this);
    this.imeCancelButton.onclick = this.hideIMEList.bind(this);
    this.imeConfirmButton.onclick = this.handleImeConfirmAction.bind(this);
    // lazy load template.js
    LazyLoader.load('shared/js/template.js');
    // bind these handlers so that we can have only one instance and check
    // them later on
    ['handleDownloadSuccess',
     'handleDownloadError',
     'handleProgress',
     'handleApplicationReady'
    ].forEach(function(name) {
      this[name] = this[name].bind(this);
    }, this);

    window.addEventListener('applicationready',
        this.handleApplicationReady);
  },

  handleApplicationReady: function ai_handleApplicationReady(e) {
    window.removeEventListener('applicationready',
        this.handleApplicationReady);

    var apps = e.detail.applications;

    Object.keys(apps)
      .filter(function(key) { return apps[key].installState === 'pending'; })
      .map(function(key) { return apps[key]; })
      .forEach(this.prepareForDownload, this);
  },

  handleApplicationInstall: function ai_handleApplicationInstallEvent(e) {
    var app = e.detail.application;

    if (app.installState === 'installed') {
      this.handleInstallSuccess(app);
      return;
    }

    this.prepareForDownload(app);
  },

  handleApplicationUninstall: function ai_handleApplicationUninstall(e) {
    var app = e.detail.application;

    this.onDownloadStop(app);
    this.onDownloadFinish(app);
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
      this.size.textContent = _('size-unknown');
    }

    // Wrap manifest to get localized properties
    manifest = new ManifestHelper(manifest);
    var msg = _('install-app', {'name': manifest.name});
    this.msg.textContent = msg;

    if (manifest.developer) {
      this.authorName.textContent = manifest.developer.name ||
        _('author-unknown');
      this.authorUrl.textContent = manifest.developer.url || '';
    } else {
      this.authorName.textContent = _('author-unknown');
      this.authorUrl.textContent = '';
    }

    this.installCallback = (function ai_installCallback() {
      this.dispatchResponse(id, 'webapps-install-granted');
    }).bind(this);

    this.installCancelCallback = (function ai_cancelCallback() {
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

  prepareForDownload: function ai_prepareForDownload(app) {
    var manifestURL = app.manifestURL;
    this.appInfos[manifestURL] = {};

    // these methods are already bound to |this|
    app.ondownloadsuccess = this.handleDownloadSuccess;
    app.ondownloaderror = this.handleDownloadError;
    app.onprogress = this.handleProgress;
  },

  configurations: {
    'input': {
      fnName: 'showIMEList'
    }
  },

  handleInstallSuccess: function ai_handleInstallSuccess(app) {
    var manifest = app.manifest || app.updateManifest;
    var role = manifest.role;

    // We must stop 3rd-party keyboard app from being installed
    // if the feature is not enabled.
    if (role === 'input' && !KeyboardManager.isOutOfProcessEnabled) {
      navigator.mozApps.mgmt.uninstall(app);

      return;
    }

    if (this.configurations[role]) {
      this.setupQueue.push(app);
      this.checkSetupQueue();
    } else {
      this.showInstallSuccess(app);
    }
    // send event
    var evt = new CustomEvent('applicationinstallsuccess',
                           { detail: { application: app } });
    window.dispatchEvent(evt);
  },

  showInstallSuccess: function ai_showInstallSuccess(app) {
    if (FtuLauncher.isFtuRunning()) {
      return;
    }
    var manifest = app.manifest || app.updateManifest;
    var appManifest = new ManifestHelper(manifest);
    var name = appManifest.name;
    var _ = navigator.mozL10n.get;
    var msg = _('app-install-success', { appName: name });
    SystemBanner.show(msg);
  },

  checkSetupQueue: function ai_checkSetupQueue() {
    if (this.setupQueue.length && !(this.isSetupInProgress)) {
      this.isSetupInProgress = true;
      this.showSetupDialog();
    }
  },

  completedSetupTask: function ai_completedSetupTask() {
    // clean completed app
    this.setupQueue.shift();
    this.isSetupInProgress = false;
    this.checkSetupQueue();
  },

  hideSetupDialog: function ai_hideSetupDialog() {
    this.setupAppName.textContent = '';
    this.setupAppDescription.textContent = '';
    this.setupInstalledAppDialog.classList.remove('visible');
  },

  showSetupDialog: function ai_showSetupDialog() {
    var app = this.setupQueue[0];
    var manifest = app.manifest;
    var appManifest = new ManifestHelper(manifest);
    var appName = appManifest.name;
    var appDescription = appManifest.description;
    this.setupAppDescription.textContent = appDescription;
    navigator.mozL10n.localize(this.setupAppName,
                              'app-install-success', { appName: appName });
    this.setupInstalledAppDialog.classList.add('visible');
    window.dispatchEvent(new CustomEvent('applicationsetupdialogshow'));
  },

  handleSetupCancelAction: function ai_handleSetupCancelAction() {
    this.hideSetupDialog();
    this.completedSetupTask();
  },

  handleSetupConfirmAction: function ai_handleSetupConfirmAction() {
    var fnName = this.configurations[this.setupQueue[0].manifest.role].fnName;
    this[fnName].call(this);
    this.hideSetupDialog();
  },

  showIMEList: function ai_showIMEList() {
    var app = this.setupQueue[0];
    var inputs = app.manifest.inputs;
    if (typeof inputs !== 'object') {
      console.error('inputs must be an object for ' +
                    'third-party keyboard layouts');
      this.completedSetupTask();
      return;
    }

    // Check permission level is correct
    var hasInputPermission = (app.manifest.type === 'certified' ||
                              app.manifest.type === 'privileged') &&
                             (app.manifest.permissions &&
                              'input' in app.manifest.permissions);
    if (!hasInputPermission) {
      console.error('third-party IME does not have correct input permission');
      this.completedSetupTask();
      return;
    }

    // build the list of keyboard layouts
    var listHtml = '';
    var imeListWrap = Template(this.imeListTemplate);
    for (var name in inputs) {
      var displayIMEName = new ManifestHelper(inputs[name]).name;
      listHtml += imeListWrap.interpolate({
        imeName: name,
        displayName: displayIMEName
      });
    }
    // keeping li template
    this.imeList.innerHTML = listHtml;
    this.imeLayoutDialog.classList.add('visible');
  },

  hideIMEList: function ai_hideIMEList() {
    this.imeLayoutDialog.classList.remove('visible');
    this.imeList.innerHTML = '';
    this.completedSetupTask();
  },

  handleImeConfirmAction: function ai_handleImeConfirmAction() {
    var origin = this.setupQueue[0].origin;
    var keyboards = this.imeList.getElementsByTagName('input');
    for (var i = 0, l = keyboards.length; i < l; i++) {
      var keyboardIME = keyboards[i];
      if (keyboardIME.checked) {
        KeyboardHelper.setLayoutEnabled(origin, keyboardIME.value, true);
        KeyboardHelper.saveToSettings();
      }
    }
    this.hideIMEList();
  },

  handleDownloadSuccess: function ai_handleDownloadSuccess(evt) {
    var app = evt.application;
    this.handleInstallSuccess(app);
    this.onDownloadStop(app);
    this.onDownloadFinish(app);
  },

  handleDownloadError: function ai_handleDownloadError(evt) {
    var app = evt.application;
    var _ = navigator.mozL10n.get;
    var manifest = app.manifest || app.updateManifest;
    var name = new ManifestHelper(manifest).name;

    var errorName = app.downloadError.name;

    switch (errorName) {
      case 'INSUFFICIENT_STORAGE':
        var title = _('not-enough-space'),
            buttonText = _('ok'),
            message = _('not-enough-space-message');

        ModalDialog.alert(title, message, {title: buttonText});
        break;
      default:
        // showing the real error to a potential developer
        console.info('downloadError event, error code is', errorName);

        var key = this.mapDownloadErrorsToMessage[errorName] || 'generic-error';
        var msg = _('app-install-' + key, { appName: name });
        SystemBanner.show(msg);
    }

    this.onDownloadStop(app);
  },

  onDownloadStart: function ai_onDownloadStart(app) {
    if (! this.hasNotification(app)) {
      StatusBar.incSystemDownloads();
      this.addNotification(app);
      this.requestWifiLock(app);
    }
  },

  onDownloadStop: function ai_onDownloadStop(app) {
    if (this.hasNotification(app)) {
      StatusBar.decSystemDownloads();
      this.removeNotification(app);
      this.releaseWifiLock(app);
    }
  },

  hasNotification: function ai_hasNotification(app) {
    var appInfo = this.appInfos[app.manifestURL];
    return appInfo && !!appInfo.installNotification;
  },

  onDownloadFinish: function ai_onDownloadFinish(app) {
    delete this.appInfos[app.manifestURL];

    // check if these are our handlers before removing them
    if (app.ondownloadsuccess === this.handleDownloadSuccess) {
      app.ondownloadsuccess = null;
    }

    if (app.ondownloaderror === this.handleDownloadError) {
      app.ondownloaderror = null;
    }

    if (app.onprogress === this.handleProgress) {
      app.onprogress = null;
    }
  },

  addNotification: function ai_addNotification(app) {
    // should be unique (this is used already in applications.js)
    var manifestURL = app.manifestURL,
        appInfo = this.appInfos[manifestURL];

    if (appInfo.installNotification) {
      return;
    }

    var newNotif =
      '<div class="fake-notification">' +
        '<div class="message"></div>' +
        '<progress></progress>' +
      '</div>';

    this.notifContainer.insertAdjacentHTML('afterbegin', newNotif);

    var newNode = this.notifContainer.firstElementChild;
    newNode.dataset.manifest = manifestURL;

    var _ = navigator.mozL10n.get;

    var manifest = app.manifest || app.updateManifest;
    var message = _('downloadingAppMessage', {
      appName: new ManifestHelper(manifest).name
    });

    newNode.querySelector('.message').textContent = message;

    var progressNode = newNode.querySelector('progress');
    if (app.updateManifest && app.updateManifest.size) {
      progressNode.max = app.updateManifest.size;
      appInfo.hasMax = true;
    }

    appInfo.installNotification = newNode;
    NotificationScreen.incExternalNotifications();
  },

  getNotificationProgressNode: function ai_getNotificationProgressNode(app) {
    var appInfo = this.appInfos[app.manifestURL];
    var progressNode = appInfo &&
      appInfo.installNotification &&
      appInfo.installNotification.querySelector('progress');
    return progressNode || null;
  },

  handleProgress: function ai_handleProgress(evt) {
    var app = evt.application,
        appInfo = this.appInfos[app.manifestURL];

    this.onDownloadStart(app);


    var progressNode = this.getNotificationProgressNode(app);
    var message;
    var _ = navigator.mozL10n.get;

    if (isNaN(app.progress) || app.progress == null) {
      // now we get NaN if there is no progress information but let's
      // handle the null and undefined cases as well
      message = _('downloadingAppProgressIndeterminate');
      progressNode.removeAttribute('value'); // switch to indeterminate state
    } else if (appInfo.hasMax) {
      message = _('downloadingAppProgress',
        {
          progress: this.humanizeSize(app.progress),
          max: this.humanizeSize(progressNode.max)
        });
      progressNode.value = app.progress;
    } else {
      message = _('downloadingAppProgressNoMax',
                 { progress: this.humanizeSize(app.progress) });
    }
    progressNode.textContent = message;
  },

  removeNotification: function ai_removeNotification(app) {
    var manifestURL = app.manifestURL,
        appInfo = this.appInfos[manifestURL],
        node = appInfo.installNotification;

    if (!node) {
      return;
    }

    node.parentNode.removeChild(node);
    delete appInfo.installNotification;
    NotificationScreen.decExternalNotifications();
  },

  requestWifiLock: function ai_requestWifiLock(app) {
    var appInfo = this.appInfos[app.manifestURL];
    if (! appInfo.wifiLock) {
      // we don't want 2 locks for the same app
      appInfo.wifiLock = navigator.requestWakeLock('wifi');
    }
  },

  releaseWifiLock: function ai_releaseWifiLock(app) {
    var appInfo = this.appInfos[app.manifestURL];

    if (appInfo.wifiLock) {
      try {
        appInfo.wifiLock.unlock();
      } catch (e) {
        // this can happen if the lock is already unlocked
        console.error('error during unlock', e);
      }

      delete appInfo.wifiLock;
    }
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

  showInstallCancelDialog: function ai_showInstallCancelDialog(evt) {
    if (evt)
      evt.preventDefault();
    this.installCancelDialog.classList.add('visible');
    this.dialog.classList.remove('visible');
  },

  hideInstallCancelDialog: function ai_hideInstallCancelDialog(evt) {
    if (evt)
      evt.preventDefault();
    this.dialog.classList.add('visible');
    this.installCancelDialog.classList.remove('visible');
  },

  showDownloadCancelDialog: function ai_showDownloadCancelDialog(e) {
    var currentNode = e.target;

    if (!currentNode.classList.contains('fake-notification')) {
      // tapped outside of a notification
      return;
    }

    var manifestURL = currentNode.dataset.manifest,
        app = Applications.getByManifestURL(manifestURL),
        manifest = app.manifest || app.updateManifest,
        dialog = this.downloadCancelDialog;

    var title = dialog.querySelector('h1');

    title.textContent = navigator.mozL10n.get('stopDownloading', {
      app: new ManifestHelper(manifest).name
    });

    dialog.classList.add('visible');
    dialog.dataset.manifest = manifestURL;
    UtilityTray.hide();
  },

  handleInstallCancel: function ai_handleInstallCancel() {
    if (this.installCancelCallback)
      this.installCancelCallback();
    this.installCancelCallback = null;
    this.installCancelDialog.classList.remove('visible');
  },

  handleConfirmDownloadCancel: function ai_handleConfirmDownloadCancel(e) {
    e && e.preventDefault();
    var dialog = this.downloadCancelDialog,
        manifestURL = dialog.dataset.manifest;
    if (manifestURL) {
      var app = Applications.getByManifestURL(manifestURL);
      app && app.cancelDownload();
    }

    this.hideDownloadCancelDialog();
  },

  handleCancelDownloadCancel: function ai_handleCancelDownloadCancel(e) {
    e && e.preventDefault();
    this.hideDownloadCancelDialog();
  },

  hideDownloadCancelDialog: function() {
    var dialog = this.downloadCancelDialog;
    dialog.classList.remove('visible');
    delete dialog.dataset.manifest;
  }
};

AppInstallManager.init();
