/* jshint moz:true */
/* global BaseModule */
/* global AppInstallDialog */
/* global AppInstallCancelDialog */
/* global AppDownloadCancelDialog */
/* global SetupInstalledAppDialog */
/* global ImeLayoutDialog */
/* global ConfirmDialogHelper */
/* global FtuLauncher */
/* global KeyboardHelper */
/* global inputWindowManager */
/* global ManifestHelper */
/* global ModalDialog */
/* global NotificationScreen */
/* global StatusBar */
/* global SystemBanner */
/* global UtilityTray */
/* global applications */

'use strict';

(function() {
  var AppInstallManager = function() {
  };

  AppInstallManager.IMPORTS = [
    'shared/js/homescreens/confirm_dialog_helper.js'
  ];

  BaseModule.create(AppInstallManager, {
    name: 'AppInstallManager',

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

    _start: function() {
      this.systemBanner = new SystemBanner();

      this.dialog = new AppInstallDialog();
      this.installCancelDialog = new AppInstallCancelDialog();
      this.downloadCancelDialog = new AppDownloadCancelDialog();
      this.setupInstalledAppDialog = new SetupInstalledAppDialog();
      this.imeLayoutDialog = new ImeLayoutDialog();     

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
        if (e.detail.type == 'webapps-ask-uninstall') {
          this.handleAppUninstallPrompt(e.detail);
        }
      }).bind(this));

      window.addEventListener('applicationinstall',
        this.handleApplicationInstall.bind(this));

      window.addEventListener('applicationuninstall',
        this.handleApplicationUninstall.bind(this));

      this.dialog.elements.installButton.onclick =
        this.handleInstall.bind(this);
      this.dialog.elements.cancelButton.onclick =
        this.showInstallCancelDialog.bind(this);
      this.installCancelDialog.elements.confirmCancelButton.onclick =
        this.handleInstallCancel.bind(this);
      this.installCancelDialog.elements.resumeButton.onclick =
        this.hideInstallCancelDialog.bind(this);

      this.notifContainer.onclick = this.showDownloadCancelDialog.bind(this);

      this.downloadCancelDialog.elements.stopButton.onclick =
        this.handleConfirmDownloadCancel.bind(this);
      this.downloadCancelDialog.elements.continueButton.onclick =
        this.handleCancelDownloadCancel.bind(this);

      this.setupInstalledAppDialog.elements.cancelButton.onclick =
        this.handleSetupCancelAction.bind(this);
      this.setupInstalledAppDialog.elements.confirmButton.onclick =
        this.handleSetupConfirmAction.bind(this);

      this.imeLayoutDialog.elements.cancelButton.onclick =
        this.hideIMEList.bind(this);
      this.imeLayoutDialog.elements.confirmButton.onclick =
        this.handleImeConfirmAction.bind(this);

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

      window.addEventListener('home', this.handleHomeButtonPressed.bind(this));
    },

    handleHomeButtonPressed: function ai_handleHomeButtonPressed(e) {
      this.dialog.hide();
      this.handleInstallCancel();

      // hide IME setup dialog if presented
      if (!this.setupInstalledAppDialog.element.hidden) {
        this.handleSetupCancelAction();
      }

      // hide IME layout list if presented
      if (!this.imeLayoutDialog.element.hidden) {
        this.hideIMEList();
      }
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

      if (!manifest) {
        return;
      }

      this.dialog.show();

      var id = detail.id;

      if (manifest.size) {
        this.dialog.elements.size.textContent =
          this.humanizeSize(manifest.size);
      } else {
        this.dialog.elements.size.textContent = _('size-unknown');
      }

      // Wrap manifest to get localized properties
      manifest = new ManifestHelper(manifest);
      var msg = _('install-app', {'name': manifest.name});
      this.dialog.elements.message.textContent = msg;

      if (manifest.developer) {
        this.dialog.elements.authorName.textContent = manifest.developer.name ||
          _('author-unknown');
        this.dialog.elements.authorUrl.textContent =
          manifest.developer.url || '';
      } else {
        this.dialog.elements.authorName.textContent = _('author-unknown');
        this.dialog.elements.authorUrl.textContent = '';
      }

      this.installCallback = (function ai_installCallback() {
        this.dispatchResponse(id, 'webapps-install-granted');
      }).bind(this);

      this.installCancelCallback = (function ai_cancelCallback() {
        this.dispatchResponse(id, 'webapps-install-denied');
      }).bind(this);

    },

    handleInstall: function ai_handleInstall(evt) {
      if (evt) {
        evt.preventDefault();
      }
      if (this.installCallback) {
        this.installCallback();
      }
      this.installCallback = null;
      this.dialog.hide();
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

      var dialogConfig;

      if (unrecoverable) {
        dialogConfig = {
          type: 'unrecoverable',
          title: 'unrecoverable-error-title',
          body: 'unrecoverable-error-body',
          confirm: {
            title: 'unrecoverable-error-action',
            cb: () => {
              this.dispatchResponse(id,'webapps-uninstall-granted'); 
            }
          }
        };
      } else {
        var nameObj = { name: manifest.name };
        dialogConfig = {
          type: 'remove',
          title: {id: 'delete-title', args: nameObj},
          body: {id: 'delete-body', args: nameObj},
          cancel: {
            title: 'cancel',
            cb: () => { this.dispatchResponse(id, 'webapps-uninstall-denied'); }
          },
          confirm: {
            title: 'delete',
            type: 'danger',
            cb: () => {
              this.dispatchResponse(id, 'webapps-uninstall-granted'); 
            }
          }
        };
      }

      var dialog = new ConfirmDialogHelper(dialogConfig);
      dialog.show(document.getElementById('app-uninstall-dialog'));
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
      if (role === 'input' && !inputWindowManager.isOutOfProcessEnabled) {
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
      var l10nId = appManifest.role === 'langpack' ?
        'langpack-install-success' : 'app-install-success';
      this.systemBanner.show(
        navigator.mozL10n.get(l10nId, { appName: name }));
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
      var setupInstalledAppDialog = this.setupInstalledAppDialog.elements;
      setupInstalledAppDialog.appName.textContent = '';
      setupInstalledAppDialog.appDescription.textContent = '';
      this.setupInstalledAppDialog.hide();
    },

    showSetupDialog: function ai_showSetupDialog() {
      var app = this.setupQueue[0];
      var manifest = app.manifest;
      var appManifest = new ManifestHelper(manifest);
      var appName = appManifest.name;
      var appDescription = appManifest.description;
      var setupInstalledAppDialog = this.setupInstalledAppDialog.elements;
      setupInstalledAppDialog.appDescription.textContent = appDescription;
      navigator.mozL10n.setAttributes(
        setupInstalledAppDialog.appName,
        'app-install-success',
        { appName: appName }
      );
      this.setupInstalledAppDialog.show();
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

      var names = [];
      for (var name in inputs) {
        var displayName = new ManifestHelper(inputs[name]).name;
        names.push({ name: name, displayName: displayName });
      }
      this.imeLayoutDialog.renderList(names);
      this.imeLayoutDialog.show();
    },

    hideIMEList: function ai_hideIMEList() {
      var imeLayoutDialog = this.imeLayoutDialog;
      imeLayoutDialog.hide();
      imeLayoutDialog.elements.list.innerHTML = '';
      this.completedSetupTask();
    },

    handleImeConfirmAction: function ai_handleImeConfirmAction() {
      var manifestURL = this.setupQueue[0].manifestURL;
      var keyboards =
        this.imeLayoutDialog.elements.list.getElementsByTagName('input');
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
      var _ = navigator.mozL10n.get;
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

          var key = this.mapDownloadErrorsToMessage[errorName] ||
            'generic-error';
          var msg = _('app-install-' + key, { appName: name });
          this.systemBanner.show(msg);
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
        `<div class="fake-notification" role="link">
          <div data-icon="rocket" class="alert"></div>
          <div class="title-container"></div>
          <progress></progress>
        </div>`;

      this.notifContainer.insertAdjacentHTML('afterbegin', newNotif);

      var newNode = this.notifContainer.firstElementChild;
      newNode.dataset.manifest = manifestURL;

      var manifest = app.manifest || app.updateManifest;

      navigator.mozL10n.setAttributes(
        newNode.querySelector('.title-container'),
        'downloadingAppMessage',
        { appName: new ManifestHelper(manifest).name }
      );

      var progressNode = newNode.querySelector('progress');
      if (app.updateManifest && app.updateManifest.size) {
        progressNode.max = app.updateManifest.size;
        appInfo.hasMax = true;
      }

      appInfo.installNotification = newNode;
      NotificationScreen.addUnreadNotification(manifestURL);
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

      if (isNaN(app.progress) || app.progress == null) {
        // now we get NaN if there is no progress information but let's
        // handle the null and undefined cases as well
        message = {
          id: 'downloadingAppProgressIndeterminate',
          args: null
        };
        progressNode.removeAttribute('value'); // switch to indeterminate state
      } else if (appInfo.hasMax) {
        message = {
          id: 'downloadingAppProgress',
          args: {
            progress: this.humanizeSize(app.progress),
            max: this.humanizeSize(progressNode.max)
          }
        };
        progressNode.value = app.progress;
      } else {
        message = {
          id: 'downloadingAppProgressNoMax',
          args: { progress: this.humanizeSize(app.progress) }
        };
      }
      navigator.mozL10n.setAttributes(
        progressNode,
        message.id,
        message.args);
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
      NotificationScreen.removeUnreadNotification(manifestURL);
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
      if (evt) {
        evt.preventDefault();
      }
      this.installCancelDialog.show();
      this.dialog.hide();
    },

    hideInstallCancelDialog: function ai_hideInstallCancelDialog(evt) {
      if (evt) {
        evt.preventDefault();
      }
      this.dialog.show();
      this.installCancelDialog.hide();
    },

    showDownloadCancelDialog: function ai_showDownloadCancelDialog(e) {
      var currentNode = e.target;

      if (!currentNode.classList.contains('fake-notification')) {
        // tapped outside of a notification
        return;
      }

      var manifestURL = currentNode.dataset.manifest,
          app = applications.getByManifestURL(manifestURL),
          manifest = app.manifest || app.updateManifest,
          dialog = this.downloadCancelDialog;

      var title = dialog.element.querySelector('h1');

      navigator.mozL10n.setAttributes(title, 'stopDownloading', {
        app: new ManifestHelper(manifest).name
      });

      dialog.show();
      dialog.element.dataset.manifest = manifestURL;
      UtilityTray.hide();
      // => Service.request('hide');
    },

    handleInstallCancel: function ai_handleInstallCancel() {
      if (this.installCancelCallback) {
        this.installCancelCallback();
      }
      this.installCancelCallback = null;
      this.installCancelDialog.hide();
    },

    handleConfirmDownloadCancel: function ai_handleConfirmDownloadCancel(e) {
      e && e.preventDefault();
      var manifestURL = this.downloadCancelDialog.element.dataset.manifest;
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
      dialog.hide();
      delete dialog.element.dataset.manifest;
    }
  });
}());
