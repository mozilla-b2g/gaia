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
    hash: '#languages',
    requireSIM: false
  },
  2: {
    hash: '#data_3g',
    requireSIM: true
  },
  3: {
    hash: '#wifi',
    requireSIM: false
  },
  4: {
    hash: '#date_and_time',
    requireSIM: false
  },
  5: {
    hash: '#geolocation',
    requireSIM: false
  },
  6: {
    hash: '#import_contacts',
    requireSIM: false
  },
  7: {
    hash: '#firefox_accounts',
    requireSIM: false
  },
  8: {
    hash: '#welcome_browser',
    requireSIM: false
  },
  9: {
    hash: '#browser_privacy',
    requireSIM: false
  }
};

// Retrieve number of steps for navigation
var numSteps = Object.keys(steps).length;

var Navigation = {
  currentStep: 1,
  previousStep: 1,
  totalSteps: numSteps,
  simMandatory: false,
  skipMobileDataScreen: false,
  skipDateTimeScreen: false,
  tzInitialized: false,
  init: function n_init() {
    var settings = navigator.mozSettings;
    var self = this;

    Array.prototype.forEach.call(
      document.getElementsByClassName('forward'),
      function(forward){
        forward.addEventListener(
          'click',
          Navigation.forward.bind(Navigation),
          true
        );
      }
    );

    UIManager.backButton.addEventListener(
      'click',
      Navigation.back.bind(Navigation)
    );

    window.addEventListener('hashchange', this);
    UIManager.activationScreen.addEventListener('click',
        this.handleExternalLinksClick.bind(this));

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
        UIManager.end();
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
        UIManager.mainTitle.setAttribute('data-l10n-id', 'language');
        UIManager.backButton.classList.add('hidden');
        break;
      case '#data_3g':
        UIManager.mainTitle.setAttribute('data-l10n-id', '3g');
        DataMobile.
          getStatus(UIManager.updateDataConnectionStatus.bind(UIManager));
        break;
      case '#wifi':
        DataMobile.removeSVStatusObserver();
        UIManager.mainTitle.setAttribute('data-l10n-id', 'selectNetwork');
        UIManager.activationScreen.classList.remove('no-options');

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
        UIManager.mainTitle.setAttribute('data-l10n-id', 'dateAndTime');
        break;
      case '#geolocation':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'geolocation');
        break;
      case '#import_contacts':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'importContacts3');
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
        UIManager.mainTitle.setAttribute('data-l10n-id', 'firefox-accounts');
        break;
      case '#welcome_browser':
        // TODO: need to localize sharePerformanceAndUsageData,
        //       and 'learn more'link inside it?
        break;
      case '#browser_privacy':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'aboutBrowser');
        var linkPrivacy = document.getElementById('external-link-privacy');
        navigator.mozL10n.setAttributes(linkPrivacy, 'learn-more-privacy2',
          getLocalizedLink('learn-more-privacy'));
        break;
      case '#SIM_mandatory':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'SIM_mandatory');
        break;
      case '#about-your-rights':
      case '#about-your-privacy':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'aboutBrowser');
        break;
      case '#sharing-performance-data':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'aboutBrowser');
        UIManager.navBar.classList.add('back-only');
        var linkTelemetry = document.getElementById('external-link-telemetry');
        navigator.mozL10n.setAttributes(linkTelemetry, 'learn-more-telemetry2',
          getLocalizedLink('learn-more-telemetry'));
        var linkInfo = document.getElementById('external-link-information');
        navigator.mozL10n.setAttributes(linkInfo, 'learn-more-information2',
          getLocalizedLink('learn-more-information'));
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
        (steps[this.currentStep].hash !== '#wifi')) {
      UIManager.activationScreen.classList.add('no-options');
    }

    // Managing nav buttons when coming back from out-of-steps (privacy)
    if (this.currentStep <= numSteps &&
        steps[this.currentStep].hash === actualHash) {
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
    } else {
      // Show back button otherwise
      UIManager.backButton.classList.remove('hidden');
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
