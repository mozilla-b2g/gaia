/* global DataMobile, SimManager, IccHelper,
          SdManager, UIManager, WifiManager, WifiUI,
          ImportIntegration,
          OperatorVariant,
          getLocalizedLink */
/* exported Navigation */
'use strict';
/*
  Steps of the First Time Usage App
*/
var steps = {
  1: {
    onlyForward: true,
    hash: '#languages',
    requireSIM: false
  },
  2: {
    onlyForward: false,
    hash: '#data_3g',
    requireSIM: true
  },
  3: {
    onlyForward: false,
    hash: '#wifi',
    requireSIM: false
  },
  4: {
    onlyForward: false,
    hash: '#date_and_time',
    requireSIM: false
  },
  5: {
    onlyForward: false,
    hash: '#geolocation',
    requireSIM: false
  },
  6: {
    onlyForward: false,
    hash: '#import_contacts',
    requireSIM: false
  },
  7: {
    onlyForward: false,
    hash: '#firefox_accounts',
    requireSIM: false
  },
  8: {
    onlyForward: false,
    hash: '#welcome_browser',
    requireSIM: false
  },
  9: {
    onlyForward: false,
    hash: '#browser_privacy',
    requireSIM: false
  }
};

// Retrieve number of steps for navigation
var numSteps = Object.keys(steps).length;

var _;

var Navigation = {
  currentStep: 1,
  previousStep: 1,
  totalSteps: numSteps,
  simMandatory: false,
  skipMobileDataScreen: false,
  skipDateTimeScreen: false,
  tzInitialized: false,
  init: function n_init() {
    _ = navigator.mozL10n.get;
    var settings = navigator.mozSettings;
    var forward = document.getElementById('forward');
    var back = document.getElementById('back');
    forward.addEventListener('click', this.forward.bind(this));
    back.addEventListener('click', this.back.bind(this));
    window.addEventListener('hashchange', this);
    UIManager.activationScreen.addEventListener('click',
        this.handleExternalLinksClick.bind(this));

    var self = this;

    var reqSIM =
      settings && settings.createLock().get('ftu.sim.mandatory') || {};
    reqSIM.onsuccess = function onSuccess() {
      self.simMandatory = reqSIM.result['ftu.sim.mandatory'] || false;
    };

    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      app.connect('ftucomms').then(function onConnAccepted(ports) {
        self.ports = ports;
      }, function onConnRejected(reason) {
        console.warn('FTU navigation cannot use IAC: ' + reason);
      });
    };
  },

  back: function n_back(event) {
    var currentStep = steps[this.currentStep];
    var actualHash = window.location.hash;
    if (actualHash != currentStep.hash) {
      window.history.back();
    } else {
      var self = this;
      var goToStep = function() {
        self.previousStep = self.currentStep;
        self.currentStep--;
        if (self.currentStep > 0) {
          self.manageStep();
        }
      };
      goToStep();
    }
  },

  forward: function n_forward(event) {
    var self = this;
    var goToStepForward = function() {
      self.previousStep = self.currentStep;
      self.currentStep++;
      if (self.currentStep > numSteps) {
        // Try to send Newsletter here
        UIManager.sendNewsletter(function newsletterSent(result) {
          if (result) { // sending process ok, we advance
            UIManager.activationScreen.classList.remove('show');
            UIManager.changeStatusBarColor(UIManager.DARK_THEME);
            UIManager.finishScreen.classList.add('show');
            UIManager.hideActivationScreenFromScreenReader();
          } else { // error on sending, we stay where we are
            self.currentStep--;
          }
        });
        return;
      }
      self.manageStep();
    };
    goToStepForward();
  },

  handleExternalLinksClick: function n_handleExternalLinksClick(e) {
    var link = e.target;
    if (! link.mozMatchesSelector('a.external')) {
      return;
    }

    e.preventDefault();
    var href = link.href,
        title = link.getAttribute('title') || link.textContent;

    if (navigator.onLine) {
      this.displayExternalLink(href, title);
    } else {
      UIManager.displayOfflineDialog(href, title);
    }
  },

  displayExternalLink: function n_displayExternalLink(href, title) {
    window.open(href, '', 'dialog');
  },

  ensureTZInitialized: function () {
    if (!this.tzInitialized) {
      return UIManager.initTZ().then(() => {
        this.skipDateTimeScreen = !UIManager.timeZoneNeedsConfirmation;
        this.tzInitialized = true;
      });
    } else {
      return Promise.resolve();
    }
  },

  handleEvent: function n_handleEvent(event) {
    var actualHash = window.location.hash;
    switch (actualHash) {
      case '#languages':
        UIManager.mainTitle.innerHTML = _('language');
        break;
      case '#data_3g':
        UIManager.mainTitle.innerHTML = _('3g');
        DataMobile.
          getStatus(UIManager.updateDataConnectionStatus.bind(UIManager));
        break;
      case '#wifi':
        DataMobile.removeSVStatusObserver();
        UIManager.mainTitle.innerHTML = _('selectNetwork');
        UIManager.activationScreen.classList.remove('no-options');
        if (UIManager.navBar.classList.contains('secondary-menu')) {
          UIManager.navBar.classList.remove('secondary-menu');
          return;
        }

        // This might seem like an odd place to call UIManager.initTZ, but
        // there's a reason for it. initTZ tries to determine the timezone
        // using information about the current mobile network connection.
        // We want to call initTZ as late as possible to give the mobile
        // network time to connect before the function is called.
        // But we have to call initTZ *before* the Date & Time page
        // appears so that it doesn't delay the appearance of the page.
        // This is the last good opportunity to call it.

        WifiManager.getNetworks(networks => {
          this.ensureTZInitialized().then(() => {
            WifiUI.renderNetworks(networks);
          });
        });

        break;
      case '#date_and_time':
        UIManager.mainTitle.innerHTML = _('dateAndTime');
        break;
      case '#geolocation':
        UIManager.mainTitle.innerHTML = _('geolocation');
        break;
      case '#import_contacts':
        UIManager.mainTitle.innerHTML = _('importContacts3');
        // Enabling or disabling SIM import depending on card status
        SimManager.checkSIMButton();

        // Enabling or disabling SD import depending on card status
        SdManager.checkSDButton();

        // If we have 3G or Wifi activate FB import
        var fbState;
        if (!WifiManager.api) {
          // Desktop
          ImportIntegration.checkImport('enabled');
          break;
        }

        fbState = window.navigator.onLine ? 'enabled' : 'disabled';
        ImportIntegration.checkImport(fbState);
        break;
      case '#firefox_accounts':
        UIManager.mainTitle.innerHTML = _('firefox-accounts');
        break;
      case '#welcome_browser':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
        var welcome = document.getElementById('browser_os_welcome');
        navigator.mozL10n.localize(welcome, 'htmlWelcome', {
          link: getLocalizedLink('htmlWelcome')
        });
        var improve = document.getElementById('browser_os_improve');
        navigator.mozL10n.localize(improve, 'helpImprove', {
          link: getLocalizedLink('helpImprove')
        });
        break;
      case '#browser_privacy':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
        var linkPrivacy = document.getElementById('external-link-privacy');
        navigator.mozL10n.localize(linkPrivacy, 'learn-more-privacy', {
          link: getLocalizedLink('learn-more-privacy')
        });
        break;
      case '#SIM_mandatory':
        UIManager.mainTitle.innerHTML = _('SIM_mandatory');
        break;
      case '#about-your-rights':
      case '#about-your-privacy':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
        UIManager.navBar.classList.add('back-only');
        break;
      case '#sharing-performance-data':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
        UIManager.navBar.classList.add('back-only');
        var linkTelemetry = document.getElementById('external-link-telemetry');
        navigator.mozL10n.localize(linkTelemetry, 'learn-more-telemetry', {
          link: getLocalizedLink('learn-more-telemetry')
        });
        var linkInfo = document.getElementById('external-link-information');
        navigator.mozL10n.localize(linkInfo, 'learn-more-information', {
          link: getLocalizedLink('learn-more-information')
        });
        break;
    }

    // If SIM card is mandatory, we hide the button skip
    if (this.simMandatory) {
      UIManager.skipPinButton.classList.add('hidden');
      UIManager.backSimButton.classList.remove('hidden');
    } else {
      UIManager.skipPinButton.classList.remove('hidden');
      UIManager.backSimButton.classList.add('hidden');
    }

    // Managing options button
    if (this.currentStep <= numSteps &&
        (steps[this.currentStep].hash === '#wifi') ===
          UIManager.activationScreen.classList.contains('no-options')) {
      UIManager.activationScreen.classList.toggle('no-options');
    }

    // Managing nav buttons when coming back from out-of-steps (privacy)
    if (this.currentStep <= numSteps &&
        steps[this.currentStep].hash === actualHash) {
      UIManager.navBar.classList.remove('back-only');
    }
  },

  /**
   * Posts IAC message about FTU steps passed.
   */
  postStepMessage: function n_postStepMessage(stepNumber) {
    if (!this.ports) {
      return;
    }
    this.ports.forEach(function(port) {
      port.postMessage({
        type: 'step',
        hash: steps[stepNumber].hash
      });
    });
  },

  skipStep: function n_skipStep() {
    this.currentStep = this.currentStep +
                      (this.currentStep - this.previousStep);
    if (this.currentStep < 1) {
      this.previousStep = this.currentStep = 1;
    }
    if (this.currentStep > numSteps) {
      this.previousStep = this.currentStep = numSteps;
    }
    this.manageStep();
  },

  manageStep: function n_manageStep() {
    var self = this;

    // If we moved forward in FTU, post iac message about progress.
    if (self.currentStep > self.previousStep) {
      self.postStepMessage(self.previousStep);
    }

    //SV - We need remember if phone startup with SIM
    if (self.currentStep >= numSteps) {
      OperatorVariant.setSIMOnFirstBootState();
    }

    // Reset totalSteps and skip screen flags at beginning of navigation
    if (self.currentStep == 1) {
      self.totalSteps = numSteps;
      self.skipMobileDataScreen = false;
    }

    // Retrieve future location
    var futureLocation = steps[self.currentStep];

    // If SIMcard is mandatory and no SIM, go to message window
    if (this.simMandatory &&
        !IccHelper.cardState &&
        futureLocation.requireSIM) {
      //Send to SIM Mandatory message
      futureLocation.hash = '#SIM_mandatory';
      futureLocation.requireSIM = false;
      futureLocation.onlyBackward = true;
    }

    // Navigation bar management
    if (steps[this.currentStep].onlyForward) {
      UIManager.navBar.classList.add('forward-only');
    } else {
      UIManager.navBar.classList.remove('forward-only');
    }
    var nextButton = document.getElementById('forward');
    if (steps[this.currentStep].onlyBackward) {
      nextButton.setAttribute('disabled', 'disabled');
    } else {
      nextButton.removeAttribute('disabled');
    }

    // Substitute button content on last step
    if (this.currentStep === numSteps) {
      nextButton.firstChild.textContent = _('done');
    } else {
      nextButton.firstChild.textContent = _('navbar-next');
    }

    if (futureLocation.hash === '#firefox_accounts') {
      nextButton.firstChild.textContent = _('skip');
    }

    // Change hash to the right location
    window.location.hash = futureLocation.hash;

    // SIM card management
    if (futureLocation.requireSIM) {
      var check_cardState = function(response) {
        if (!response || (!SimManager.available() &&
          // Don't skip it if next step is data 3g
         futureLocation.hash !== '#data_3g')) {
          self.skipStep();
          if (self.currentStep > self.previousStep) {
            self.skipMobileDataScreen = true;
            self.totalSteps--;
          }
        }
      };

      // if we are navigating backwards, we do not want to
      // show the SIM unlock screens for the data_3g step
      var skipUnlockScreens = this.currentStep < this.previousStep;
      SimManager.handleCardState(check_cardState, skipUnlockScreens);
    }

    // Only show the Date & Time screen if we couldn't determine the
    // timezone from the network. (We assume that if we can
    // determine the timezone, we can determine the time too.)
    if (steps[self.currentStep].hash === '#date_and_time') {
      if (!self.tzInitialized) {
        self.skipDateTimeScreen = !UIManager.timeZoneNeedsConfirmation;
      }

      if (self.skipDateTimeScreen) {
        self.postStepMessage(self.currentStep);
        if(navigator.onLine) {
          //if you are online you can get a more accurate guess for the time
          //time you just need to trigger it
          UIManager.updateSetting(
            'time.timezone.automatic-update.enabled', 
            true
          );
          UIManager.updateSetting(
            'time.clock.automatic-update.enabled', 
            true
          );
        }
        self.skipStep();
      }
    }

    // if we are not connected we should not try fxa
    if (futureLocation.hash === '#firefox_accounts' &&
        !navigator.onLine) {
      self.postStepMessage(self.currentStep);
      self.skipStep();
    }
  }
};
