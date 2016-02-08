/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global ActivityWindowManager, VisibilityManager, UsbStorage,
         Activities, AppUsageMetrics, RemoteControl,
         DeveloperHUD, RemoteDebugger, HomeGesture,
         SuspendingAppPriorityManager, TTLView,
         MediaRecording, Service,
         applications, PermissionManager, Accessibility,
         SleepMenu, InteractiveNotifications, ExternalStorageMonitor,
         BaseModule */

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

    window.BookmarkManager.init(
      'app://app-deck.gaiamobile.org/manifest.webapp', 'readwrite');
  }

  function safelyLaunchFTU() {
    window.addEventListener('homescreenloaded', function onHomescreenLoaded() {
      window.removeEventListener('homescreenloaded', onHomescreenLoaded);
      // To let GijTV tests know we are ready to test.
      document.body.setAttribute('ready-state', 'fullyLoaded');
    });
    window.addEventListener('homescreenwindowmanager-ready',
      function onHomescreenReady() {
        window.removeEventListener('homescreenwindowmanager-ready',
                                   onHomescreenReady);
        Service.request('retrieve');
      });
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

  // Please sort it alphabetically
  window.activities = new Activities();
  window.accessibility = new Accessibility();
  window.accessibility.start();
  window.developerHUD = new DeveloperHUD();
  window.developerHUD.start();
  /** @global */
  window.attentionWindowManager = new window.AttentionWindowManager();
  window.attentionWindowManager.start();
  window.externalStorageMonitor = new ExternalStorageMonitor();
  window.externalStorageMonitor.start();
  window.homeGesture = new HomeGesture();
  window.homeGesture.start();
  window.permissionManager = new PermissionManager();
  window.permissionManager.start();
  window.remoteDebugger = new RemoteDebugger();
  window.sleepMenu = new SleepMenu();
  window.sleepMenu.start();
  window.ttlView = new TTLView();
  window.visibilityManager = new VisibilityManager();
  window.visibilityManager.start();

  // unit tests call start() manually
  if (navigator.mozL10n) {
    navigator.mozL10n.once(function l10n_ready() {
      window.mediaRecording = new MediaRecording();
      window.mediaRecording.start();
    });
  }
  window.interactiveNotifications = new InteractiveNotifications();
  window.interactiveNotifications.start();

  window.appUsageMetrics = new AppUsageMetrics();
  window.appUsageMetrics.start();

  window.remoteControl = new RemoteControl();
  window.remoteControl.start();

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

  window.core = BaseModule.instantiate('Core');
  window.core && window.core.start();
});

window.usbStorage = new UsbStorage();

// Define the default background to use for all as
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
