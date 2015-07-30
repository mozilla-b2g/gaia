/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global ActivityWindowManager, HomescreenLauncher, HomescreenWindowManager,
         FtuLauncher, ScreenManager, Activities,
         DeveloperHUD, RemoteDebugger, HomeGesture,
         VisibilityManager, UsbStorage,
         SuspendingAppPriorityManager, TTLView,
         MediaRecording, AppWindowFactory,
         applications, LayoutManager, PermissionManager, Accessibility,
         SleepMenu, InteractiveNotifications, ExternalStorageMonitor */
'use strict';


window.addEventListener('load', function startup() {
  /**
   * Register global instances and constructors here.
   */
  function registerGlobalEntries() {
    /** @global */
    window.activityWindowManager = new ActivityWindowManager();
    window.activityWindowManager.start();
    /** @global */
    if (window.SuspendingAppPriorityManager) {
      window.suspendingAppPriorityManager = new SuspendingAppPriorityManager();
    }

    window.AppWindowManager.init();
  }

  function safelyLaunchFTU() {
    window.addEventListener('homescreenwindowmanager-ready',
      function onHomescreenReady() {
        window.removeEventListener('homescreenwindowmanager-ready',
                                   onHomescreenReady);
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
  }

  window.addEventListener('ftudone', doneWithFTU);
  // Enable checkForUpdate as well if booted without FTU
  window.addEventListener('ftuskip', doneWithFTU);

  ScreenManager.turnScreenOn();

  // To make sure homescreen window manager can intercept webapps-launch event,
  // we need to move the code here.
  window.homescreenWindowManager = new HomescreenWindowManager();
  window.homescreenWindowManager.start();

  // Please sort it alphabetically
  window.activities = new Activities();
  window.accessibility = new Accessibility();
  window.accessibility.start();
  window.appWindowFactory = new AppWindowFactory();
  window.appWindowFactory.start();
  window.developerHUD = new DeveloperHUD();
  window.developerHUD.start();
  /** @global */
  window.attentionWindowManager = new window.AttentionWindowManager();
  window.attentionWindowManager.start();
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
  window.layoutManager = new LayoutManager();
  window.layoutManager.start();
  window.permissionManager = new PermissionManager();
  window.permissionManager.start();
  window.remoteDebugger = new RemoteDebugger();
  window.sleepMenu = new SleepMenu();
  window.sleepMenu.start();
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
    });
  }
  window.interactiveNotifications = new InteractiveNotifications();
  window.interactiveNotifications.start();
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
});

window.usbStorage = new UsbStorage();

// Define the default background to use for all homescreens
window.addEventListener('wallpaperchange', function(evt) {
  document.getElementById('screen').style.backgroundImage =
    'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)),' +
    'url(' + evt.detail.url + ')';
});

/* === XXX Bug 900512 === */
// On some devices touching the hardware home button triggers
// touch events at position 0,0. In order to make sure those does
// not trigger unexpected behaviors those are captured here.
function cancelHomeTouchstart(e) {
  if (e.touches[0].pageX === 0 && e.touches[0].pageY === 0) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

function cancelHomeTouchend(e) {
  if (e.changedTouches[0].pageX === 0 && e.changedTouches[0].pageY === 0) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

function cancelHomeClick(e) {
  if (e.pageX === 0 && e.pageY === 0) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}

window.addEventListener('touchstart', cancelHomeTouchstart, true);
window.addEventListener('touchend', cancelHomeTouchend, true);
window.addEventListener('mousedown', cancelHomeClick, true);
window.addEventListener('mouseup', cancelHomeClick, true);
