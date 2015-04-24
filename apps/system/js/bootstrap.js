/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global ActivityHandler, ActivityWindowManager, Browser, SecureWindowFactory,
         SecureWindowManager, HomescreenLauncher, HomescreenWindowManager,
         FtuLauncher, SourceView, ScreenManager, Places, Activities,
         DeveloperHUD, DialerAgent, RemoteDebugger, HomeGesture,
         VisibilityManager, UsbStorage, TaskManager, Import,
         SuspendingAppPriorityManager, TTLView,
         MediaRecording, AppWindowFactory, SystemDialogManager,
         applications, Rocketbar, LayoutManager, PermissionManager,
         SoftwareButtonManager, Accessibility, NfcUtils,
         TextSelectionDialog, SleepMenu, AppUsageMetrics,
         LockScreenPasscodeValidator,
         ExternalStorageMonitor, TrustedWindowManager,
         BrowserSettings, AppMigrator, SettingsMigrator,
         CpuManager, CellBroadcastSystem, EdgeSwipeDetector, QuickSettings,
         BatteryOverlay, BaseModule, AppWindowManager, KeyboardManager,
         DevToolsAuth */
'use strict';

/* === Shortcuts === */
/* For hardware key handling that doesn't belong to anywhere */
var Shortcuts = {
  init: function rm_init() {
    window.addEventListener('keyup', this);
  },

  handleEvent: function rm_handleEvent(evt) {
    if (!ScreenManager.screenEnabled || evt.keyCode !== evt.DOM_VK_F6) {
      return;
    }

    document.location.reload();
  }
};

window.addEventListener('load', function startup() {
  /**
   * Register global instances and constructors here.
   */
  function registerGlobalEntries() {
    /** @global */
    KeyboardManager.init();

    /** @global */
    window.appWindowManager = new AppWindowManager();

    /** @global */
    window.inputWindowManager = new window.InputWindowManager();
    window.inputWindowManager.start();

    /** @global */
    window.activityWindowManager = new ActivityWindowManager();
    window.activityWindowManager.start();

    /** @global */
    window.secureWindowManager = window.secureWindowManager ||
      new SecureWindowManager();
    /** @global */
    window.secureWindowFactory = new SecureWindowFactory();
    /** @global */
    if (window.SuspendingAppPriorityManager) {
      window.suspendingAppPriorityManager = new SuspendingAppPriorityManager();
    }

    /** @global */
    window.systemDialogManager = window.systemDialogManager ||
      new SystemDialogManager();

    /** @global */
    window.trustedWindowManager = window.trustedWindowManager ||
      new TrustedWindowManager();
    window.trustedWindowManager.start();

    /** @global */
    window.lockScreenWindowManager = new window.LockScreenWindowManager();
    window.lockScreenWindowManager.start();

    window.appWindowManager.start();

    /** @global */
    window.textSelectionDialog = new TextSelectionDialog();
  }

  function safelyLaunchFTU() {
    window.addEventListener('homescreen-ready', function onHomescreenReady() {
      window.removeEventListener('homescreen-ready', onHomescreenReady);
      FtuLauncher.retrieve();
    });
    /** @global */
    if (!window.homescreenLauncher) {
      // We may have application.ready = true while reloading at firefox nightly
      // browser. In this case, the window.homescreenLauncher haven't been
      // created. We should create it and start it in this case.
      window.homescreenLauncher = new HomescreenLauncher();
    }
    window.homescreenLauncher.start();
  }

  if (applications.ready) {
    registerGlobalEntries();
    safelyLaunchFTU();
  } else {
    window.addEventListener('applicationready', function appListReady(event) {
      window.removeEventListener('applicationready', appListReady);
      registerGlobalEntries();
      safelyLaunchFTU();
    });
  }

  /**
   * Enable checkForUpdate after FTU is either done or skipped.
   */
  function doneWithFTU() {
    window.removeEventListener('ftudone', doneWithFTU);
    window.removeEventListener('ftuskip', doneWithFTU);
    var lock = window.navigator.mozSettings.createLock();
    lock.set({
      'gaia.system.checkForUpdates': true
    });
    // make sure new key is available in system
    window.settingsMigrator = new SettingsMigrator();
    window.settingsMigrator.start();
  }

  window.addEventListener('ftudone', doneWithFTU);
  // Enable checkForUpdate as well if booted without FTU
  window.addEventListener('ftuskip', doneWithFTU);

  Shortcuts.init();

  ScreenManager.turnScreenOn();

  // To make sure homescreen window manager can intercept webapps-launch event,
  // we need to move the code here.
  window.homescreenWindowManager = new HomescreenWindowManager();
  window.homescreenWindowManager.start();

  // Please sort it alphabetically
  window.activities = new Activities();
  window.accessibility = new Accessibility();
  window.accessibility.start();
  window.appMigrator = new AppMigrator();
  window.appMigrator.start();
  window.appUsageMetrics = new AppUsageMetrics();
  window.appUsageMetrics.start();
  window.appWindowFactory = new AppWindowFactory();
  window.appWindowFactory.start();
  window.batteryOverlay = new BatteryOverlay();
  window.batteryOverlay.start();
  window.cellBroadcastSystem = new CellBroadcastSystem();
  window.cellBroadcastSystem.start();
  window.cpuManager = new CpuManager();
  window.cpuManager.start();
  window.developerHUD = new DeveloperHUD();
  window.developerHUD.start();
  window.devToolsAuth = new DevToolsAuth();
  /** @global */
  window.attentionWindowManager = new window.AttentionWindowManager();
  window.attentionWindowManager.start();
  window.globalOverlayWindowManager = new window.GlobalOverlayWindowManager();
  window.globalOverlayWindowManager.start();
  window.dialerAgent = new DialerAgent();
  window.dialerAgent.start();
  window.edgeSwipeDetector = new EdgeSwipeDetector();
  window.edgeSwipeDetector.start();
  window.externalStorageMonitor = new ExternalStorageMonitor();
  window.externalStorageMonitor.start();
  window.homeGesture = new HomeGesture();
  window.homeGesture.start();
  if (!window.homescreenLauncher) {
    // If application.ready is true, we already create homescreenLauncher in
    // safelyLaunchFTU(). We should use it. If it is false, we should create it
    // here.
    window.homescreenLauncher = new HomescreenLauncher();
  }
  window.lockScreenPasscodeValidator = new LockScreenPasscodeValidator();
  window.lockScreenPasscodeValidator.start();
  window.layoutManager = new LayoutManager();
  window.layoutManager.start();
  window.nfcUtils = new NfcUtils();
  window.permissionManager = new PermissionManager();
  window.permissionManager.start();
  window.places = new Places();
  window.places.start();
  window.remoteDebugger = new RemoteDebugger();
  window.rocketbar = new Rocketbar();
  window.sleepMenu = new SleepMenu();
  window.sleepMenu.start();
  window.softwareButtonManager = new SoftwareButtonManager();
  window.softwareButtonManager.start();
  window.sourceView = new SourceView();
  window.taskManager = new TaskManager();
  window.taskManager.start();
  window.ttlView = new TTLView();
  window.visibilityManager = new VisibilityManager();
  window.visibilityManager.start();
  window.wallpaperManager = new window.WallpaperManager();
  window.wallpaperManager.start();

  // unit tests call start() manually
  if (navigator.mozL10n) {
    navigator.mozL10n.once(function l10n_ready() {
      window.mediaRecording = new MediaRecording();
      window.mediaRecording.start();
      window.quickSettings = new QuickSettings();
      window.quickSettings.start();
    });
  }

  // We need to be sure to get the focus in order to wake up the screen
  // if the phone goes to sleep before any user interaction.
  // Apparently it works because no other window has the focus at this point.
  window.focus();

  // With all important event handlers in place, we can now notify
  // Gecko that we're ready for certain system services to send us
  // messages (e.g. the radio).
  // Note that shell.js starts listen for the mozContentEvent event at
  // mozbrowserloadstart, which sometimes does not happen till window.onload.
  var evt = new CustomEvent('mozContentEvent',
      { bubbles: true, cancelable: false,
        detail: { type: 'system-message-listener-ready' } });
  window.dispatchEvent(evt);


  window.performance.mark('loadEnd');

  window.core = BaseModule.instantiate('Core');
  window.core && window.core.start();
});

window.usbStorage = new UsbStorage();

// Define the default background to use for all homescreens
window.addEventListener('wallpaperchange', function(evt) {
  document.getElementById('screen').style.backgroundImage =
    'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)),' +
    'url(' + evt.detail.url + ')';
});


window.browser = new Browser();
window.browser.start();
window.import = new Import();
window.import.start();
window.activityHandler = new ActivityHandler();
window.activityHandler.start();
window.browserSettings = new BrowserSettings();
window.browserSettings.start();
