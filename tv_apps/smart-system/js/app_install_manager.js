/* jshint moz:true */
/* global FtuLauncher */
/* global KeyboardHelper */
/* global KeyboardManager */
/* global LazyLoader */
/* global ManifestHelper */
/* global ModalDialog */
/* global SystemBanner */
/* global Template */
/* global focusManager */
/* global AppInstallDialogs */

'use strict';

// note: we removed the download cancel dialog because we don't have an UI to
// remove it.

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
    this.appInstallDialogs = new AppInstallDialogs(
      document.getElementById('app-install-dialogs'));
    this.appInstallDialogs.start();
    this.systemBanner = new SystemBanner();
    this.imeLayoutDialog = document.getElementById('ime-layout-dialog');
    this.imeListTemplate = document.getElementById('ime-list-template');
    this.imeList = document.getElementById('ime-list');
    this.imeCancelButton = document.getElementById('ime-cancel-button');
    this.imeConfirmButton = document.getElementById('ime-confirm-button');

    focusManager.addUI(this);

    this.appInfos = {};
    this.setupQueue = [];
    this.isSetupInProgress = false;
    window.addEventListener('mozChromeEvent',
      (function ai_handleChromeEvent(e) {
      if (e.detail.type == 'webapps-ask-install') {
        this.handleAppInstallPrompt(e.detail);
      }
      if (e.detail.type == 'webapps-ask-uninstall') {
        this.handleAppUninstallPrompt(e.detail);
      }
    }).bind(this));

    window.addEventListener('applicationinstall',
      this.handleApplicationInstall.bind(this));

    window.addEventListener('applicationuninstall',
      this.handleApplicationUninstall.bind(this));

    this.imeCancelButton.onclick = this.hideIMEList.bind(this);
    this.imeConfirmButton.onclick = this.handleImeConfirmAction.bind(this);
    LazyLoader.load(['shared/js/template.js',
                     'shared/js/homescreens/confirm_dialog_helper.js']);

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

    // TODO: write an integration test for pressing home.
    window.addEventListener('home', this.hideAllDialogs.bind(this));
  },

  hideAllDialogs: function ai_hideAllDialogs(e) {
    this.appInstallDialogs.hideAll();
    if (this.imeLayoutDialog.classList.contains('visible')) {
      this.imeLayoutDialog.classList.remove('visible');
      this.hideIMEList();
    }
  },

  handleApplicationReady: function ai_handleApplicationReady(e) {
    window.removeEventListener('applicationready',
        this.handleApplicationReady);

    var apps = e.detail.applications;

    Object.keys(apps)
      .filter(function(key) { return apps[key].installState === 'pending'; })
      .map(function(key) { return apps[key]; })
      .forEach(this.prepareForDownload, this);
  },

  // start of app install
  handleApplicationInstall: function ai_handleApplicationInstallEvent(e) {
    var app = e.detail.application;

    if (app.installState === 'installed') {
      this.handleInstallSuccess(app);
      return;
    }

    this.prepareForDownload(app);
  },

  handleAppInstallPrompt: function ai_handleInstallPrompt(detail) {
    var app = detail.app;
    // updateManifest is used by packaged apps until they are installed
    var manifest = app.manifest ? app.manifest : app.updateManifest;

    if (!manifest) {
      return;
    }

    // Wrap manifest to get localized properties
    manifest = new ManifestHelper(manifest);

    var id = detail.id;
    var TYPES = AppInstallDialogs.TYPES;
    var options = { 'manifest':  manifest };
    this.appInstallDialogs.show(TYPES.InstallDialog, options).then(
      this.handleInstall.bind(this), this.showInstallCancelDialog.bind(this)
    ).catch(function(e) {
      console.error(e);
    });

    this.installCallback = (function ai_installCallback() {
      this.dispatchResponse(id, 'webapps-install-granted');
    }).bind(this);

    this.installCancelCallback = (function ai_cancelCallback() {
      this.dispatchResponse(id, 'webapps-install-denied');
    }).bind(this);

  },

  handleInstall: function ai_handleInstall(err) {
    if (err instanceof Error) {
      // show error in promise
      console.error(err);
    }
    if (this.installCallback) {
      this.installCallback();
    }
    this.installCallback = null;
  },

  handleInstallCancel: function ai_handleInstallCancel(err) {
    if (err instanceof Error) {
      // show error in promise
      console.error(err);
    }
    if (this.installCancelCallback) {
      this.installCancelCallback();
    }
    this.installCancelCallback = null;
  },
  // end of app install

  // start of app uninstall
  handleApplicationUninstall: function ai_handleApplicationUninstall(e) {
    var app = e.detail.application;

    this.onDownloadStop(app);
    this.onDownloadFinish(app);
  },

  handleAppUninstallPrompt: function ai_handleUninstallPrompt(detail) {
    var app = detail.app;
    var id = detail.id;

    // updateManifest is used by packaged apps until they are installed
    var manifest = app.manifest ? app.manifest : app.updateManifest;
    if (!manifest) {
      return;
    }

    // Wrap manifest to get localized properties
    manifest = new ManifestHelper(manifest);

    var unrecoverable = app.installState === 'pending' &&
                        !app.downloadAvailable &&
                        !app.readyToApplyDownload;

    var TYPES = AppInstallDialogs.TYPES;

    var options = { 'manifest':  manifest, 'unrecoverable': unrecoverable };

    this.appInstallDialogs.show(TYPES.UninstallDialog, options).then(
      this.handleUninstall.bind(this), this.hideUninstallCancel.bind(this)
    ).catch(function(e) {
      console.error(e);
    });

    this.uninstallCallback = (function ai_uninstallCallback() {
      this.dispatchResponse(id, 'webapps-uninstall-granted');
    }).bind(this);

    this.uninstallCancelCallback = (function ai_cancelCallback() {
      this.dispatchResponse(id, 'webapps-uninstall-denied');
    }).bind(this);
  },

  handleUninstall: function ai_handleUninstallDialog() {
    if (this.uninstallCallback) {
      this.uninstallCallback();
    }
    this.uninstallCallback = null;
  },

  hideUninstallCancel: function ai_hideUninstallCancelDialog(err) {
    if (err instanceof Error) {
      // show error in promise
      console.error(err);
    }
    if (this.uninstallCancelCallback) {
      this.uninstallCancelCallback();
    }
    this.uninstallCancelCallback = null;
  },
  // end of app uninstall

  // start of setup app
  configurations: {
    'input': {
      fnName: 'showIMEList'
    }
  },

  showSetupDialog: function ai_showSetupDialog() {
    var app = this.setupQueue[0];
    var options = { 'manifest':  new ManifestHelper(app.manifest) };
    var TYPES = AppInstallDialogs.TYPES;

    this.appInstallDialogs.show(TYPES.SetupAppDialog, options).then(
      this.handleSetupConfirm.bind(this), this.handleSetupCancel.bind(this)
    ).catch(function(e) {
      console.error(e);
    });

    window.dispatchEvent(new CustomEvent('applicationsetupdialogshow'));
  },

  handleSetupCancel: function ai_handleSetupCancelAction(err) {
    if (err instanceof Error) {
      // show error in promise
      console.error(err);
    }
    this.completedSetupTask();
  },

  handleSetupConfirm: function ai_handleSetupConfirmAction() {
    var fnName = this.configurations[this.setupQueue[0].manifest.role].fnName;
    this[fnName].call(this);
  },
  // end of setup app

  // start of install cancel dialog
  showInstallCancelDialog: function ai_showInstallCancelDialog(err) {
    if (err instanceof Error) {
      // show error in promise
      console.error(err);
    }
    var TYPES = AppInstallDialogs.TYPES;

    this.appInstallDialogs.show(TYPES.InstallCancelDialog, {}).then(
      this.handleInstallCancel.bind(this),
      this.handleInstall.bind(this) // cancel means to continue to install.
    ).catch(function(e) {
      console.error(e);
    });
  },
  // end of install cancel dialog

  prepareForDownload: function ai_prepareForDownload(app) {
    var manifestURL = app.manifestURL;
    this.appInfos[manifestURL] = {};

    // these methods are already bound to |this|
    app.ondownloadsuccess = this.handleDownloadSuccess;
    app.ondownloaderror = this.handleDownloadError;
    app.onprogress = this.handleProgress;
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
    var msg = {
      id: 'app-install-success',
      args: { appName: name }
    };
    this.systemBanner.show(msg);
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
    focusManager.focus();
  },

  hideIMEList: function ai_hideIMEList() {
    this.imeLayoutDialog.classList.remove('visible');
    this.imeList.innerHTML = '';
    this.completedSetupTask();
  },

  handleImeConfirmAction: function ai_handleImeConfirmAction() {
    var manifestURL = this.setupQueue[0].manifestURL;
    var keyboards = this.imeList.getElementsByTagName('input');
    for (var i = 0, l = keyboards.length; i < l; i++) {
      var keyboardIME = keyboards[i];
      if (keyboardIME.checked) {
        KeyboardHelper.setLayoutEnabled(manifestURL, keyboardIME.value, true);
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
    var manifest = app.manifest || app.updateManifest;
    var name = new ManifestHelper(manifest).name;

    var errorName = app.downloadError.name;

    switch (errorName) {
      case 'INSUFFICIENT_STORAGE':
        var title = 'not-enough-space',
            buttonText = 'ok',
            message = 'not-enough-space-message';

        ModalDialog.alert(title, message, {title: buttonText});
        break;
      default:
        // showing the real error to a potential developer
        console.info('downloadError event, error code is', errorName);

        var key = this.mapDownloadErrorsToMessage[errorName] || 'generic-error';
        var msg = {
          id: 'app-install-' + key,
          args: { appName: name }
        };
        this.systemBanner.show(msg);
    }

    this.onDownloadStop(app);
  },

  onDownloadStart: function ai_onDownloadStart(app) {
    var manifestURL = app.manifestURL,
        appInfo = this.appInfos[manifestURL];
    if (!appInfo.isDownloading) {
      appInfo.isDownloading = true;
      this.requestWifiLock(app);
    }
  },

  onDownloadStop: function ai_onDownloadStop(app) {
    var manifestURL = app.manifestURL,
        appInfo = this.appInfos[manifestURL];
    if (appInfo && appInfo.isDownloading) {
      this.releaseWifiLock(app);
      appInfo.isDownloading = false;
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

  handleProgress: function ai_handleProgress(evt) {
    this.onDownloadStart(evt.application);
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

    if (!bytes) {
      return '0.00 ' + _(units[0]);
    }

    var e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(e))).toFixed(2) + ' ' +
      _(units[e]);
  },

  isFocusable: function() {
    if (this.imeLayoutDialog.classList.contains('visible')) {
      return true;
    } else {
      return this.appInstallDialogs.hasVisibleDialog();
    }
  },

  getElement: function() {
    if (this.imeLayoutDialog.classList.contains('visible')) {
      return this.imeLayoutDialog;
    } else {
      return this.appInstallDialogs.getTopMostDialogElement();
    }
  },

  focus: function() {
    if (this.imeLayoutDialog.classList.contains('visible')) {
      document.activeElement.blur();
      this.imeCancelButton.focus();
    } else {
      this.appInstallDialogs.focus();
    }
  }
};

AppInstallManager.init();
