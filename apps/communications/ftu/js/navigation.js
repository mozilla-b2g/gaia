'use strict';
/*
  Steps of the First Time Usage App
*/
var steps = {
  1: {
    onlyForward: true,
    onlyBackward: false,
    hash: '#languages',
    requireSIM: false
  },
  2: {
    onlyForward: false,
    onlyBackward: true,
    hash: '#SIM_mandatory',
    requireSIM: true
  },
  3: {
    onlyForward: false,
    onlyBackward: false,
    hash: '#data_3g',
    requireSIM: true
  },
  4: {
    onlyForward: false,
    onlyBackward: false,
    hash: '#wifi',
    requireSIM: false
  },
  5: {
    onlyForward: false,
    onlyBackward: false,
    hash: '#date_and_time',
    requireSIM: false
  },
  6: {
    onlyForward: false,
    onlyBackward: false,
    hash: '#geolocation',
    requireSIM: false
  },
  7: {
    onlyForward: false,
    onlyBackward: false,
    hash: '#import_contacts',
    requireSIM: false
  },
  8: {
    onlyForward: false,
    onlyBackward: false,
    hash: '#welcome_browser',
    requireSIM: false
  },
  9: {
    onlyForward: false,
    onlyBackward: false,
    hash: '#browser_privacy',
    requireSIM: false
  }
};

// Retrieve number of steps for navigation
var numSteps = Object.keys(steps).length;

var Navigation = {
  currentStep: 1,
  previousStep: 1,

  init: function n_init() {
    _ = navigator.mozL10n.get;
    var forward = document.getElementById('forward');
    var back = document.getElementById('back');
    forward.addEventListener('click', this.forward.bind(this));
    back.addEventListener('click', this.back.bind(this));
    window.addEventListener('hashchange', this);
    UIManager.activationScreen.addEventListener('click',
        this.handleExternalLinksClick.bind(this));
    this.simMandatory = false;

    var req = navigator.mozSettings.createLock().get('ftu.sim.mandatory');
    var self = this;
    req.onsuccess = function onSuccess() {
      if (req.result['ftu.sim.mandatory']) {
        self.simMandatory = req.result['ftu.sim.mandatory'];
      }
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
            Tutorial.init();
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
    window.open(href);
  },

  getProgressBarClassName: function n_getProgressBarClassName() {
    // Manage step state (dynamically change)
    var className = 'step-state step-';
    if (this.skipped && this.currentStep > 2) {
      className += (this.currentStep - 1) + ' less-steps';
    } else {
      className += this.currentStep;
    }

    return className;
  },

  handleEvent: function n_handleEvent(event) {
    var actualHash = window.location.hash;
    var className = this.getProgressBarClassName();

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
        UIManager.mainTitle.innerHTML = _('selectNetwork');
        UIManager.activationScreen.classList.remove('no-options');
        if (UIManager.navBar.classList.contains('secondary-menu')) {
          UIManager.navBar.classList.remove('secondary-menu');
          return;
        }
        // Avoid refresh when connecting
        WifiManager.scan(WifiUI.renderNetworks);
        break;
      case '#geolocation':
        UIManager.mainTitle.innerHTML = _('geolocation');
        break;
      case '#date_and_time':
        UIManager.mainTitle.innerHTML = _('dateAndTime');
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
      case '#welcome_browser':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
        break;
      case '#browser_privacy':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
        break;
      case '#SIM_mandatory':
        UIManager.mainTitle.innerHTML = _('SIM_mandatory');
        // If SIM card is mandatory, we hide the button skip
        if (this.simMandatory) {
          UIManager.unlockSimButton.classList.add('send-only');
          UIManager.skipPinButton.classList.add('send-only');
        }else {
          UIManager.unlockSimButton.classList.remove('send-only');
          UIManager.skipPinButton.classList.remove('send-only');
        }
        DataMobile.
          getStatus(UIManager.updateDataConnectionStatus.bind(UIManager));

        break;
      case '#about-your-rights':
      case '#about-your-privacy':
      case '#sharing-performance-data':
        UIManager.mainTitle.innerHTML = _('aboutBrowser');
        // override the className here
        className = 'hidden';
        UIManager.navBar.classList.add('back-only');
        break;
    }

    UIManager.progressBar.className = className;

    // Managing options button
    if (this.currentStep != 4) { //wifi
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
    this.skipped = true;
    this.manageStep();
  },

  manageStep: function n_manageStep() {
    var self = this;
    // Retrieve future location
    var futureLocation = steps[self.currentStep];
    // There is some locations which need a 'loading'
    if (futureLocation.hash === '#wifi') {
      utils.overlay.show(_('scanningNetworks'), 'spinner');
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
      SimManager.handleCardState(function check_cardState(response) {
        self.skipped = false;
        if (!response) {
          if (!self.simMandatory) {
            self.skipStep();
          }
        } else if (futureLocation.hash === '#SIM_mandatory') {
          self.skipStep();
        }
      });
      self.checkCurrentStep();
    }
  },
  // If we unlock the sim and current step is SIM_mandatory,
  // we have to skip the current step
  checkCurrentStep: function n_checkCurrentStep() {
     if (steps[this.currentStep].hash === '#SIM_mandatory') {
        if (!this.simMandatory || (this.simMandatory && SimManager._unlocked)) {
          this.skipStep();
        }
      }
  }
};

