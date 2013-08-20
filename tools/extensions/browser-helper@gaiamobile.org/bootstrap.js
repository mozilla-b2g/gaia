/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function debug(data) {
  dump('browser-helper: ' + data + '\n');
}

function startup(data, reason) {
  Cu.import('resource://gre/modules/Services.jsm');

  try {
    // Initialize various JSM instanciated by shell.js
    // All of them are usefull even if we don't use them in this file.
    Cu.import('resource://gre/modules/ContactService.jsm');
    Cu.import('resource://gre/modules/SettingsChangeNotifier.jsm');
    Cu.import('resource://gre/modules/ActivitiesService.jsm');
    Cu.import('resource://gre/modules/PermissionPromptHelper.jsm');

    var mm = Cc['@mozilla.org/globalmessagemanager;1']
               .getService(Ci.nsIMessageBroadcaster);
    // Allow panning to work in the system app.
    mm.loadFrameScript('chrome://global/content/BrowserElementPanning.js', true);

    // Enable mozApps.getAll and app.launch to work.
    // By default on firefox, apps are consider as not launchable
    // and only launchable apps appear in getAll().
    Cu.import('resource://gre/modules/Webapps.jsm');
    DOMApplicationRegistry.allAppsLaunchable = true;

    // Track loading of the system app in order to load our striped down copy
    // of shell.xul
    Services.obs.addObserver(function(document) {
      // Some documents like XBL don't have location and should be ignored
      if (!document.location)
        return;
      let domain = document.location.toString();
      if (domain.indexOf('system.gaiamobile.org') != -1) {
        let scope = {
          content: document.defaultView
        };
        Services.scriptloader.loadSubScript(
          'chrome://browser-helper.js/content/shell.js', scope);
      }
    }, 'document-element-inserted', false);

    Services.obs.addObserver(function() {
      let browserWindow = Services.wm.getMostRecentWindow('navigator:browser');

      // Inject CSS in browser to customize responsive view
      let doc = browserWindow.document;
      let pi = doc.createProcessingInstruction('xml-stylesheet', 'href="chrome://browser-helper.js/content/browser.css" type="text/css"');
      doc.insertBefore(pi, doc.firstChild);

      // Inject custom controls in responsive view
      Cu.import('resource:///modules/devtools/responsivedesign.jsm');
      ResponsiveUIManager.once('on', function(event, tab, responsive) {
        let document = tab.ownerDocument;

        // Ensure tweaking only the first responsive mode opened
        responsive.stack.classList.add('os-mode');

        let sleepButton = document.createElement('button');
        sleepButton.id = 'os-sleep-button';
        sleepButton.setAttribute('top', 0);
        sleepButton.setAttribute('right', 0);
        sleepButton.addEventListener('mousedown', function() {
          sendChromeEvent({type: 'sleep-button-press'});
        });
        sleepButton.addEventListener('mouseup', function() {
          sendChromeEvent({type: 'sleep-button-release'});
        });
        responsive.stack.appendChild(sleepButton);

        let volumeButtons = document.createElement('vbox');
        volumeButtons.id = 'os-volume-buttons';
        volumeButtons.setAttribute('top', 0);
        volumeButtons.setAttribute('left', 0);

        let volumeUp = document.createElement('button');
        volumeUp.id = 'os-volume-up-button';
        volumeUp.addEventListener('mousedown', function() {
          sendChromeEvent({type: 'volume-up-button-press'});
        });
        volumeUp.addEventListener('mouseup', function() {
          sendChromeEvent({type: 'volume-up-button-release'});
        });

        let volumeDown = document.createElement('button');
        volumeDown.id = 'os-volume-down-button';
        volumeDown.addEventListener('mousedown', function() {
          sendChromeEvent({type: 'volume-down-button-press'});
        });
        volumeDown.addEventListener('mouseup', function() {
          sendChromeEvent({type: 'volume-down-button-release'});
        });

        volumeButtons.appendChild(volumeUp);
        volumeButtons.appendChild(volumeDown);
        responsive.stack.appendChild(volumeButtons);

        // <toolbar id="os-hardware-button">
        //  <toolbarbutton id="os-home-button" />
        // </toolbar>
        let bottomToolbar = document.createElement('toolbar');
        bottomToolbar.id = 'os-hardware-buttons';
        bottomToolbar.setAttribute('align', 'center');
        bottomToolbar.setAttribute('pack', 'center');

        let homeButton = document.createElement('toolbarbutton');
        homeButton.id = 'os-home-button';
        homeButton.setAttribute('class', 'devtools-toolbarbutton');

        homeButton.addEventListener('mousedown', function() {
          sendChromeEvent({type: 'home-button-press'});
        });
        homeButton.addEventListener('mouseup', function() {
          sendChromeEvent({type: 'home-button-release'});
        });
        bottomToolbar.appendChild(homeButton);
        responsive.container.appendChild(bottomToolbar);

        // Simulate chrome event.
        function sendChromeEvent(detail) {
          let contentWindow = responsive.browser.contentWindow;
          var contentDetail = Components.utils.createObjectIn(contentWindow);
          for (var i in detail) {
            contentDetail[i] = detail[i];
          }
          Components.utils.makeObjectPropsNormal(contentDetail);

          var customEvt = contentWindow.document.createEvent('CustomEvent');
          customEvt.initCustomEvent('mozChromeEvent', true, true, contentDetail);
          contentWindow.dispatchEvent(customEvt);
        }
      });

      // Cleanup responsive mode if it's disabled
      ResponsiveUIManager.on('off', function(event, tab, responsive) {
        if (responsive.stack.classList.contains('os-mode')) {
          responsive.stack.classList.remove('os-mode');
          let document = tab.ownerDocument;
          let sleepButton = document.getElementById('os-sleep-button');
          responsive.stack.removeChild(sleepButton);
          let volumeButtons = document.getElementById('os-volume-buttons');
          responsive.stack.removeChild(volumeButtons);
          let bottomToolbar = document.getElementById('os-hardware-buttons');
          responsive.container.removeChild(bottomToolbar);
        }
      });

      // Automatically toggle responsive design mode
      let width = 320, height = 480;
      // We have to take into account padding and border introduced with the
      // device look'n feel:
      width += 15*2; // Horizontal padding
      width += 1*2; // Vertical border
      height += 60; // Top Padding
      height += 1; // Top border
      let args = {'width': width, 'height': height};
      let mgr = browserWindow.ResponsiveUI.ResponsiveUIManager;
      mgr.handleGcliCommand(browserWindow,
                            browserWindow.gBrowser.selectedTab,
                            'resize to',
                            args);

      // And devtool panel while maximizing its size according to screen size
      Services.prefs.setIntPref('devtools.toolbox.sidebar.width',
                                browserWindow.outerWidth - 550);
      gDevToolsBrowser.selectToolCommand(browserWindow.gBrowser);

      // XXX This code should be loaded by the keyboard/ extension
      try {
        // Try to load a the keyboard if there is a keyboard addon.
        Cu.import('resource://keyboard.js/Keyboard.jsm');
        mm.addMessageListener('Forms:Input', Keyboard);
        mm.addMessageListener('Forms:SelectionChange', Keyboard);
        mm.addMessageListener('Forms:GetText:Result:OK', Keyboard);
        mm.addMessageListener('Forms:GetText:Result:Error', Keyboard);
        mm.addMessageListener('Forms:SetSelectionRange:Result:OK', Keyboard);
        mm.addMessageListener('Forms:ReplaceSurroundingText:Result:OK', Keyboard);
        mm.addMessageListener('Forms:SendKey:Result:OK', Keyboard);
        mm.addMessageListener('Forms:SequenceError', Keyboard);
        mm.addMessageListener('Forms:GetContext:Result:OK', Keyboard);
        mm.loadFrameScript('chrome://keyboard.js/content/forms.js', true);
      } catch(e) {
        debug('Can\'t load Keyboard.jsm. Likely because the keyboard addon is not here.');
      }
    }, 'sessionstore-windows-restored', false);

    try {
      // Register a new devtool panel with various OS controls
      Cu.import('resource:///modules/devtools/gDevTools.jsm');
      gDevTools.registerTool({
        id: 'firefox-os-controls',
        key: 'F',
        modifiers: 'accel,shift',
        icon: 'chrome://browser-helper.js/content/panel/icon.gif',
        url: 'chrome://browser-helper.js/content/panel/index.html',
        label: 'FFOS Control',
        tooltip: 'Set of controls to tune FirefoxOS apps in Desktop browser',
        isTargetSupported: function(target) {
          return target.isLocalTab;
        },
        build: function(iframeWindow, toolbox) {
          iframeWindow.wrappedJSObject.tab = toolbox.target.window;
          return {
            destroy: function () {}
          };
        }
      });
    } catch(e) {
      debug('Can\'t load the devtools panel. Likely because this version of Gecko is too old');
    }

  } catch (e) {
    debug('Something went wrong while trying to start browser-helper: ' + e);
  }
}
