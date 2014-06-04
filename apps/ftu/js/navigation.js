/* global DataMobile, SimManager, IccHelper,
          SdManager, UIManager, WifiManager, WifiUI,
          ImportIntegration,
          OperatorVariant,
          getLocalizedLink,
          utils */
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
  skipDataScreen: false,
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

  // Compute the position of the navigation progress bar
  getProgressBarState: function n_getProgressBarState() {
    // Initial step
    if (this.currentStep == 1) {
      return 1;
    }

    var progressBarPosition = this.currentStep - (this.skipDataScreen ? 1 : 0);

    if (progressBarPosition > this.totalSteps) {
      return this.totalSteps;
    }

    return progressBarPosition;
  },

  handleEvent: function n_handleEvent(event) {
    var actualHash = window.location.hash;
    UIManager.progressBar.classList.remove('hidden');
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
        // Avoid refresh when connecting
        WifiManager.scan(WifiUI.renderNetworks);
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
          return;
        }

        fbState = window.navigator.onLine ? 'enabled' : 'disabled';
        ImportIntegration.checkImport(fbState);
        break;
      case '#firefox_accounts':
        UIManager.mainTitle.innerHTML = _('firefox-accounts');
        break;
      case '#welcome_browser':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
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
        UIManager.progressBar.classList.add('hidden');
        UIManager.navBar.classList.add('back-only');
        break;
      case '#sharing-performance-data':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
        UIManager.progressBar.classList.add('hidden');
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

    var progressBarState = this.getProgressBarState();
    UIManager.progressBarState.style.width =
      'calc(100% / ' + this.totalSteps + ')';
    UIManager.progressBarState.style.transform =
      'translateX(' + ((progressBarState - 1) * 100) + '%)';
    UIManager.progressBar.setAttribute('aria-valuetext', _('progressbar', {
      step: progressBarState,
      total: this.totalSteps
    }));
    UIManager.progressBar.setAttribute('aria-valuemin', 1);
    UIManager.progressBar.setAttribute('aria-valuemax', this.totalSteps);

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
        steps[this.currentStep].hash !== '#wifi') {
      UIManager.activationScreen.classList.add('no-options');
    }

    // Managing nav buttons when coming back from out-of-steps (privacy)
    if (this.currentStep <= numSteps &&
        steps[this.currentStep].hash === actualHash) {
      UIManager.navBar.classList.remove('back-only');
    }
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
    //SV - We need remember if phone startup with SIM
    if (self.currentStep >= numSteps) {
      OperatorVariant.setSIMOnFirstBootState();
    }

    // Reset totalSteps and skip screen flags at beginning of navigation
    if (self.currentStep == 1) {
      self.totalSteps = numSteps;
      self.skipDataScreen = false;
    }

    // Retrieve future location
    var futureLocation = steps[self.currentStep];

    // There is some locations which need a 'loading'
    if (futureLocation.hash === '#wifi') {
      utils.overlay.show(_('scanningNetworks'), 'spinner');
    }

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

    // Change hash to the right location
    window.location.hash = futureLocation.hash;

    // SIM card management
    if (futureLocation.requireSIM) {
      var check_cardState = function(response) {
        if (!response || (!SimManager.available() &&
          // Don't skip it if next step is data 3g
         futureLocation.hash !== '#data_3g')) {
          self.skipStep();
          // To avoid jumping the progress bar, update its width to match the
          // new total number of steps
          if (self.currentStep > self.previousStep) {
            self.skipDataScreen = true;
            self.totalSteps--;
          }
        }
      };

      // if we are navigating backwards, we do not want to
      // show the SIM unlock screens for the data_3g step
      var skipUnlockScreens = this.currentStep < this.previousStep;
      SimManager.handleCardState(check_cardState, skipUnlockScreens);
    }
  }
};
