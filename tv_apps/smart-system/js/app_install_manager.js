/* jshint moz:true */
/* global FtuLauncher */
/* global KeyboardHelper */
/* global KeyboardManager */
/* global LazyLoader */
/* global ManifestHelper */
/* global ModalDialog */
/* global SystemBanner */
/* global Template */
/* global applications */
/* global KeyNavigationAdapter */
/* global SimpleKeyNavigation */
/* global focusManager */

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
    this.systemBanner = new SystemBanner();
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

    this.appUninstallDialog = document.getElementById('app-uninstall-dialog');
    this.appUninstallMessage = document.getElementById('app-uninstall-message');
    this.appUninstallCancelButton =
      document.getElementById('app-uninstall-cancel-button');
    this.appUninstallConfirmButton =
      document.getElementById('app-uninstall-confirm-button');

    this.resumeButton = document.getElementById('app-install-resume-button');

    // List of all dialogs, and it's default focused button
    this.dialogList = [
      {
        dialog: this.dialog,
        focusElement: this.installButton
      },
      {
        dialog: this.installCancelDialog,
        focusElement: this.confirmCancelButton
      },
      {
        dialog: this.appUninstallDialog,
        focusElement: this.appUninstallCancelButton
      },
      {
        dialog: this.downloadCancelDialog,
        focusElement: this.downloadCancelDialog.querySelector('.cancel')
      },
      {
        dialog: this.imeLayoutDialog,
        focusElement: this.imeCancelButton
      },
      {
        dialog: this.setupInstalledAppDialog,
        focusElement: this.setupCancelButton
      }
    ];
    focusManager.addUI(this);

    this.simpleKeyNavigation = new SimpleKeyNavigation();

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

    this.installButton.onclick = this.handleInstall.bind(this);
    this.cancelButton.onclick = this.showInstallCancelDialog.bind(this);
    this.confirmCancelButton.onclick = this.handleInstallCancel.bind(this);
    this.resumeButton.onclick = this.hideInstallCancelDialog.bind(this);

    this.appUninstallCancelButton.onclick =
      this.hideUninstallCancelDialog.bind(this);
    this.appUninstallConfirmButton.onclick =
      this.handleUninstallDialog.bind(this);

    this.downloadCancelDialog.querySelector('.confirm').onclick =
      this.handleConfirmDownloadCancel.bind(this);
    this.downloadCancelDialog.querySelector('.cancel').onclick =
      this.handleCancelDownloadCancel.bind(this);

    this.setupCancelButton.onclick = this.handleSetupCancelAction.bind(this);
    this.setupConfirmButton.onclick =
                             this.handleSetupConfirmAction.bind(this);
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

    window.addEventListener('home', this.hideAllDialogs.bind(this));

    this.keyNavigationAdapter = new KeyNavigationAdapter();
    this.keyNavigationAdapter.on('esc-keyup', this.escKeyUpHandler.bind(this));
  },

  escKeyUpHandler: function ai_escKeyUpHandler() {
    this.keyNavigationAdapter.uninit();
    this.hideAllDialogs();
  },

  hideAllDialogs: function ai_hideAllDialogs(e) {
    if (this.dialog.classList.contains('visible')) {
      this.dialog.classList.remove('visible');
      this.handleInstallCancel();
    } else if (this.installCancelDialog.classList.contains('visible')) {
      this.installCancelDialog.classList.remove('visible');
      this.handleInstallCancel();
    } else if (this.appUninstallDialog.classList.contains('visible')) {
      this.appUninstallDialog.classList.remove('visible');
      this.hideUninstallCancelDialog();
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
    var app = detail.app;
    // updateManifest is used by packaged apps until they are installed
    var manifest = app.manifest ? app.manifest : app.updateManifest;

    if (!manifest) {
      return;
    }

    this.hookSimpleNavigator(
      [this.cancelButton, this.installButton], this.installButton);

    this.dialog.classList.add('visible');
    focusManager.focus();

    var id = detail.id;

    // Wrap manifest to get localized properties
    manifest = new ManifestHelper(manifest);
    navigator.mozL10n.setAttributes(this.msg,
      'install-app', {'name': manifest.name}
    );

    this.keyNavigationAdapter.init();

    this.installCallback = (function ai_installCallback() {
      this.unhookSimpleNavigator();
      this.dispatchResponse(id, 'webapps-install-granted');
    }).bind(this);

    this.installCancelCallback = (function ai_cancelCallback() {
      this.unhookSimpleNavigator();
      this.dispatchResponse(id, 'webapps-install-denied');
    }).bind(this);

  },

  handleInstall: function ai_handleInstall(evt) {
    if (this.installCallback) {
      this.installCallback();
    }
    this.installCallback = null;
    this.dialog.classList.remove('visible');
    focusManager.focus();
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

    if (unrecoverable) {
      this.hookSimpleNavigator(
        [this.appUninstallConfirmButton],
        this.appUninstallConfirmButton);

      this.appUninstallDialog.classList.add('visible');
      focusManager.focus();

      // Hide Cancel button and adjust its position.
      this.appUninstallCancelButton.style.display = 'none';
      this.appUninstallConfirmButton.style.marginLeft = '0';
      this.appUninstallConfirmButton.parentNode.setAttribute('data-items', 1);

      navigator.mozL10n.setAttributes(this.appUninstallMessage,
        'unrecoverable-error-body'
      );
    } else {
      this.hookSimpleNavigator(
        [this.appUninstallCancelButton, this.appUninstallConfirmButton],
        this.appUninstallCancelButton);

      this.appUninstallDialog.classList.add('visible');
      focusManager.focus();

      // Show Cancel button.
      this.appUninstallCancelButton.style.display = '';
      this.appUninstallConfirmButton.style.marginLeft = '';
      this.appUninstallConfirmButton.parentNode.setAttribute('data-items', 2);

      navigator.mozL10n.setAttributes(this.appUninstallMessage,
        'delete-body', {'name': manifest.name}
      );
    }

    this.keyNavigationAdapter.init();

    this.uninstallCallback = (function ai_uninstallCallback() {
      this.unhookSimpleNavigator();
      this.dispatchResponse(id, 'webapps-uninstall-granted');
    }).bind(this);

    this.uninstallCancelCallback = (function ai_cancelCallback() {
      this.unhookSimpleNavigator();
      this.dispatchResponse(id, 'webapps-uninstall-denied');
    }).bind(this);
  },

  handleUninstallDialog: function ai_handleUninstallDialog(evt) {
    if (this.uninstallCallback) {
      this.uninstallCallback();
    }
    this.uninstallCallback = null;
    this.appUninstallDialog.classList.remove('visible');
    focusManager.focus();
  },

  hideUninstallCancelDialog: function ai_hideUninstallCancelDialog(evt) {
    if (this.uninstallCancelCallback) {
      this.uninstallCancelCallback();
    }
    this.uninstallCancelCallback = null;
    this.appUninstallDialog.classList.remove('visible');
    focusManager.focus();
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
    navigator.mozL10n.setAttributes(this.setupAppName,
                                    'app-install-success',
                                    { appName: appName });
    this.setupInstalledAppDialog.classList.add('visible');
    focusManager.focus();
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

  showInstallCancelDialog: function ai_showInstallCancelDialog(evt) {
    this.hookSimpleNavigator(
      [this.confirmCancelButton, this.resumeButton], this.confirmCancelButton);

    this.installCancelDialog.classList.add('visible');
    this.dialog.classList.remove('visible');
    focusManager.focus();
  },

  hideInstallCancelDialog: function ai_hideInstallCancelDialog(evt) {
    this.unhookSimpleNavigator();
    this.hookSimpleNavigator(
      [this.cancelButton, this.installButton], this.installButton);
    this.dialog.classList.add('visible');
    this.installCancelDialog.classList.remove('visible');
    focusManager.focus();
  },

  handleInstallCancel: function ai_handleInstallCancel() {
    if (this.installCancelCallback) {
      this.installCancelCallback();
    }
    this.unhookSimpleNavigator();
    this.installCancelCallback = null;
    this.installCancelDialog.classList.remove('visible');
    focusManager.focus();
  },

  handleConfirmDownloadCancel: function ai_handleConfirmDownloadCancel(e) {
    e && e.preventDefault();
    var dialog = this.downloadCancelDialog,
        manifestURL = dialog.dataset.manifest;
    if (manifestURL) {
      var app = applications.getByManifestURL(manifestURL);
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
  },

  hookSimpleNavigator: function(navigableButtons, defaultFocusButton) {
    var that = this;
    this.simpleKeyNavigation.start(navigableButtons,
      SimpleKeyNavigation.DIRECTION.HORIZONTAL);
    window.setTimeout(function() {
      if (document.activeElement) {
        document.activeElement.blur();
      }
      if (defaultFocusButton) {
        that.simpleKeyNavigation.focusOn(defaultFocusButton);
      }
    });
    this.simpleKeyNavigation.on('focusChanged', function(focusedButton) {
      focusedButton.focus();
    });
  },

  unhookSimpleNavigator: function() {
    this.simpleKeyNavigation.off('focusChanged');
    this.simpleKeyNavigation.stop();
  },

  isFocusable: function() {
    var i;
    for (i = 0; i < this.dialogList.length; i++) {
      if (this.dialogList[i].dialog.classList.contains('visible')) {
        return true;
      }
    }
  },

  getElement: function() {
    var i;
    for (i = 0; i < this.dialogList.length; i++) {
      if (this.dialogList[i].dialog.classList.contains('visible')) {
        return this.dialogList[i].dialog;
      }
    }
  },

  focus: function() {
    var i;
    for (i = 0; i < this.dialogList.length; i++) {
      if (this.dialogList[i].dialog.classList.contains('visible')) {
        document.activeElement.blur();
        this.dialogList[i].focusElement.focus();
        return;
      }
    }
  }
};

AppInstallManager.init();
