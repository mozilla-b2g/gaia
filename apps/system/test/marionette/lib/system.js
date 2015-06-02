'use strict';

function System(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = System;

System.URL = 'app://system.gaiamobile.org/manifest.webapp';

System.Selector = Object.freeze({
  screen: '#screen',
  activeHomescreenFrame: '#homescreen.appWindow.active',
  appAuthDialog: '.appWindow.active .authentication-dialog.visible',
  // XXX: Gaia-header covers the back button, so you can't tap on it.
  // This is a problem with gaia-header, so instead we return the gaia-header,
  // And manually tap on the expected coordinate.
  appAuthDialogCancel: '.appWindow.active .authentication-dialog.visible ' +
    'gaia-header',
  appAuthDialogLogin: '.appWindow.active .authentication-dialog.visible ' +
    'button.authentication-dialog-http-authentication-ok',
  appAuthDialogUsername: '.appWindow.active .authentication-dialog.visible ' +
    '.authentication-dialog-http-username-input',
  appAuthDialogPassword: '.appWindow.active .authentication-dialog.visible ' +
    '.authentication-dialog-http-password-input',
  appContextMenuSaveLink:
    '.appWindow.active .contextmenu [data-id="save-link"]',
  appWindow: '.appWindow',
  appTitlebar: '.appWindow.active .titlebar',
  appUrlbar: '.appWindow.active .title',
  appChrome: '.appWindow.active .chrome',
  appChromeBack: '.appWindow.active .back-button',
  appChromeForward: '.appWindow.active .forward-button',
  appChromeContextLink: '.appWindow.active .menu-button',
  appChromeContextMenu: '.appWindow.active .contextmenu',
  appChromeContextNewPrivate: '.appWindow.active [data-id=new-private-window]',
  appChromeContextMenuNewWindow: '.appWindow.active [data-id=new-window]',
  appChromeContextMenuBookmark: '.appWindow.active [data-id=add-to-homescreen]',
  appChromeContextMenuShare: '.appWindow.active [data-id=share]',
  appChromeReloadButton: '.appWindow.active .controls .reload-button',
  appChromeStopButton: '.appWindow.active .controls .stop-button',
  appChromeWindowsButton: '.appWindow.active .controls .windows-button',
  appChromeProgressBar: '.appWindow.active .chrome gaia-progress',
  browserWindow: '.appWindow.browser',
  currentWindow: '.appWindow.active',
  dialogOverlay: '#screen #dialog-overlay',
  downloadDialog: '#downloadConfirmUI',
  imeMenu: '.ime-menu',
  inlineActivity: '.appWindow.inline-activity',
  sleepMenuContainer: '#sleep-menu-container',
  softwareButtons: '#software-buttons',
  softwareHome: '#software-home-button',
  softwareHomeFullscreen: '#fullscreen-software-home-button',
  softwareHomeFullscreenLayout: '#software-buttons-fullscreen-layout',
  statusbar: '#statusbar',
  statusbarShadow: '.appWindow.active .statusbar-shadow',
  statusbarShadowTray: '#statusbar-tray',
  statusbarShadowActivity: '.activityWindow.active .statusbar-shadow',
  statusbarMaximizedWrapper: '#statusbar-maximized-wrapper',
  statusbarMinimizedWrapper: '#statusbar-minimized-wrapper',
  statusbarOperator: '.statusbar-operator',
  systemBanner: '.banner.generic-dialog',
  topPanel: '#top-panel',
  trustedWindow: '.appWindow.active.trustedwindow',
  trustedWindowChrome: '.appWindow.active.trustedwindow .chrome',
  leftPanel: '#left-panel',
  rightPanel: '#right-panel',
  utilityTray: '#utility-tray',
  visibleForm: '#action-menu > form.visible',
  cancelActivity: '#action-menu form.visible button[data-action="cancel"]',
  nfcIcon: '.statusbar-nfc',
  activeKeyboard: '.inputWindow.active'
});

System.prototype = {
  client: null,

  URL: System.URL,

  Selector: System.Selector,

  getAppWindows: function() {
    return this.client.findElements(System.Selector.appWindow);
  },

  getBrowserWindows: function() {
    var searchTimeout = this.client.searchTimeout;
    this.client.setSearchTimeout(0);

    var elements = this.client.findElements(System.Selector.browserWindow);

    this.client.setSearchTimeout(searchTimeout);
    return elements;
  },

  get activeHomescreenFrame() {
    var homescreen = System.Selector.activeHomescreenFrame;
    return this.client.helper.waitForElement(homescreen);
  },

  get appAuthDialog() {
    return this.client.helper.waitForElement(System.Selector.appAuthDialog);
  },

  get appAuthDialogCancel() {
    return this.client.helper.waitForElement(
      System.Selector.appAuthDialogCancel);
  },

  get appAuthDialogLogin() {
    return this.client.helper.waitForElement(
      System.Selector.appAuthDialogLogin);
  },

  get appAuthDialogUsername() {
    return this.client.helper.waitForElement(
      System.Selector.appAuthDialogUsername);
  },

  get appAuthDialogPassword() {
    return this.client.helper.waitForElement(
      System.Selector.appAuthDialogPassword);
  },

  get appContextMenuSaveLink() {
    return this.client.helper.waitForElement(
      System.Selector.appContextMenuSaveLink);
  },

  get appTitlebar() {
    return this.client.helper.waitForElement(System.Selector.appTitlebar);
  },

  get appUrlbar() {
    return this.client.helper.waitForElement(System.Selector.appUrlbar);
  },

  get appChrome() {
    return this.client.helper.waitForElement(
      System.Selector.appChrome);
  },

  get appChromeBack() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeBack);
  },

  get appChromeForward() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeForward);
  },

  get appChromeContextLink() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextLink);
  },

  get appChromeContextMenu() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextMenu);
  },

  get appChromeContextNewPrivate() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextNewPrivate);
  },

  get appChromeContextMenuNewWindow() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextMenuNewWindow);
  },

  get appChromeContextMenuBookmark() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextMenuBookmark);
  },

  get appChromeContextMenuShare() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextMenuShare);
  },

  get appChromeReloadButton() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeReloadButton);
  },

  get appChromeStopButton() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeStopButton);
  },

  get appChromeProgressBar() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeProgressBar);
  },

  get currentWindow() {
    return this.client.helper.waitForElement(System.Selector.currentWindow);
  },

  get dialogOverlay() {
    return this.client.helper.waitForElement(
      System.Selector.dialogOverlay);
  },

  get downloadDialog() {
    return this.client.helper.waitForElement(System.Selector.downloadDialog);
  },

  get imeMenu() {
    return this.client.helper.waitForElement(System.Selector.imeMenu);
  },

  get inlineActivity() {
    return this.client.helper.waitForElement(System.Selector.inlineActivity);
  },

  get sleepMenuContainer() {
    return this.client.helper.waitForElement(
      System.Selector.sleepMenuContainer);
  },

  get softwareButtons() {
    return this.client.findElement(System.Selector.softwareButtons);
  },

  get softwareHome() {
    return this.client.findElement(System.Selector.softwareHome);
  },

  get softwareHomeFullscreen() {
    return this.client.findElement(System.Selector.softwareHomeFullscreen);
  },

  get softwareHomeFullscreenLayout() {
    return this.client.findElement(
      System.Selector.softwareHomeFullscreenLayout);
  },

  get statusbar() {
    return this.client.findElement(System.Selector.statusbar);
  },

  get statusbarMaximizedWrapper() {
    return this.client.findElement(System.Selector.statusbarMaximizedWrapper);
  },

  get statusbarMinimizedWrapper() {
    return this.client.findElement(System.Selector.statusbarMinimizedWrapper);
  },

  get statusbarOperator() {
    return this.client.findElement(System.Selector.statusbarOperator);
  },

  get systemBanner() {
    return this.client.helper.waitForElement(System.Selector.systemBanner);
  },

  get trustedWindow() {
    return this.client.helper.waitForElement(
      System.Selector.trustedWindow);
  },

  get trustedWindowChrome() {
    return this.client.helper.waitForElement(
      System.Selector.trustedWindowChrome);
  },

  get utilityTray() {
    return this.client.findElement(System.Selector.utilityTray);
  },

  get topPanel() {
    return this.client.findElement(System.Selector.topPanel);
  },

  get leftPanel() {
    return this.client.findElement(System.Selector.leftPanel);
  },

  get rightPanel() {
    return this.client.findElement(System.Selector.rightPanel);
  },

  get visibleForm() {
    return this.client.findElement(System.Selector.visibleForm);
  },

  get cancelActivity() {
    return this.client.findElement(System.Selector.cancelActivity);
  },

  get screenSize() {
    return this.client.findElement(System.Selector.screen).size();
  },

  get nfcIcon() {
    return this.client.findElement(System.Selector.nfcIcon);
  },

  get statusbarShadow() {
    return this.client.findElement(System.Selector.statusbarShadow);
  },

  get statusbarShadowTray() {
    return this.client.findElement(System.Selector.statusbarShadowTray);
  },

  get statusbarShadowActivity() {
    return this.client.findElement(System.Selector.statusbarShadowActivity);
  },

  getAppIframe: function(url) {
    return this.client.findElement('iframe[src*="' + url + '"]');
  },

  /**
   * Clicks the bottom of the screen, where we expect the software home button
   * to exist. There are several different variations in the same spot, this
   * allows us to try to click all of them.
   */
  clickSoftwareHomeButton: function() {
    var body = this.client.findElement('body');
    var screenSize = body.scriptWith(function(el) {
      return el.getBoundingClientRect();
    });
    body.tap(screenSize.width / 2, screenSize.height - 10);
  },

  gotoBrowser: function(url) {
    var frame = this.client.helper.waitForElement(
      'div[transition-state="opened"] iframe[src="' + url + '"]');
    this.client.switchToFrame(frame);
    this.client.helper.waitForElement('body');
  },

  getHomescreenIframe: function() {
    return this.client.findElement('#homescreen iframe');
  },

  waitForLaunch: function(url) {
    this.client.apps.launch(url);
    var iframe = this.getAppIframe(url);
    this.client.waitFor(function() {
      return iframe.displayed();
    });

    return iframe;
  },

  waitForStartup: function() {
    var osLogo = this.client.findElement('#os-logo');
    this.client.waitFor(function() {
      return osLogo.getAttribute('class') == 'hide';
    });
  },

  waitForFullyLoaded: function() {
    var body = this.client.findElement('body');
    this.client.waitFor(function() {
      return body.getAttribute('ready-state') == 'fullyLoaded';
    });
  },

  // Since the getScreenshot call is asynchronous and does not have any
  // external side effect, we're just queuing another screenshot request
  // afterward to be sure it's done.
  waitUntilScreenshotable: function(iframe) {
    this.client.executeAsyncScript(function(iframe) {
      iframe.wrappedJSObject.getScreenshot(1, 1).then(marionetteScriptFinished,
                                                      marionetteScriptFinished);
    }, [iframe]);
  },

  waitForKeyboard: function() {
    this.client.helper.waitForElement(System.Selector.activeKeyboard);
  },

  waitForKeyboardToDisappear: function() {
    this.client.helper.waitForElementToDisappear(
      System.Selector.activeKeyboard
    );
  },

  goHome: function() {
    this.client.switchToFrame();
    this.client.executeAsyncScript(function() {
      var win = window.wrappedJSObject;
      win.addEventListener('homescreenopened', function trWait() {
        win.removeEventListener('homescreenopened', trWait);
        marionetteScriptFinished();
      });
      win.dispatchEvent(new CustomEvent('home'));
    });
  },

  tapHome: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
  },

  holdHome: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('holdhome'));
    });
  },

  resize: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('resize'));
    });
  },

  request: function(service) {
    this.client.executeScript(function(service) {
      window.wrappedJSObject.Service.request(service);
    }, [service]);
  },

  turnScreenOn: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.Service.request(
        'turnScreenOn');
    });
  },

  turnScreenOff: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.Service.request(
        'turnScreenOff', true, 'powerkey');
    });
  },

  stopClock: function() {
    var client = this.client;
    var clock = this.client.findElement('#statusbar-time');
    client.executeScript(function() {
      window.wrappedJSObject.Service.request('TimeIcon:stop');
    });
    client.waitFor(function() {
      return !clock.displayed();
    });
  },

  stopStatusbar: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.Service.request('Statusbar:pauseUpdate',
        'marionette');
    });
  },

  stopDevtools: function() {
    this.client.executeScript(function() {
      window.wrappedJSObject.Service.request('DeveloperHud:stop');
    });
  },

  // The activity menu has a transform transition where it appears from the
  // bottom of the screen. This waits for that to complete.
  waitForActivityMenu: function() {
    var form = this.client.helper.waitForElement(System.Selector.visibleForm);
    this.client.waitFor(function() {
      return form.scriptWith(function(element) {
        return window.getComputedStyle(element).transform ===
          'matrix(1, 0, 0, 1, 0, 0)';
      });
    });
  },

  // It looks for an activity menu, and returns the first
  // button element which includes with str
  getActivityOptionMatching: function(str) {
    var activityMenuSelector = System.Selector.visibleForm + ' button.icon';
    var options = this.client.findElements(activityMenuSelector);
    for (var i = 0; i < options.length; i++) {
      if (options[i].getAttribute('style').indexOf(str) > 1) {
        return options[i];
      }
    }
  },

  sendSystemUpdateNotification: function() {
    this.client.executeScript(function() {
      var UpdateManager = window.wrappedJSObject.UpdateManager;
      UpdateManager.addToUpdatesQueue(UpdateManager.systemUpdatable);
      UpdateManager.displayNotificationAndToaster();
    });
  }
};
