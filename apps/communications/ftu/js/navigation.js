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
    hash: '#import_contacts',
    requireSIM: false
  },
  6: {
    onlyForward: false,
    hash: '#welcome_firefox',
    requireSIM: false
  },
  7: {
    onlyForward: false,
    hash: '#firefox_privacy',
    requireSIM: false
  }
};

// Retrieve number of steps for navigation
var numSteps = Object.keys(steps).length;

var Navigation = {
  currentStep: 1,
  init: function n_init() {
    var forward = document.getElementById('forward');
    var back = document.getElementById('back');
    forward.addEventListener('click', this.forward.bind(this));
    back.addEventListener('click', this.back.bind(this));
    window.addEventListener('hashchange', this);
  },
  back: function n_back(event) {
    var currentStep = steps[this.currentStep];
    if (window.location.hash != currentStep.hash) {
      UIManager.navBar.classList.remove('back-only');
      window.history.back();
    } else {
      var self = this;
      var goToStep = function() {
        self.currentStep--;
        if (self.currentStep > 0) {
          var followingStep = steps[self.currentStep];
          if (followingStep.requireSIM && !AppManager.thereIsSIM) {
            goToStep();
          } else {
            self.manageStep();
          }
        }
      };
      goToStep();
    }
  },
  forward: function n_forward(event) {
    var self = this;
    var goToStepForward = function() {
      self.currentStep++;
      if (self.currentStep > numSteps) {
        UIManager.activationScreen.classList.remove('show');
        UIManager.finishScreen.classList.add('show');
        return;
      }
      var followingStep = steps[self.currentStep];
      if (followingStep.requireSIM && !AppManager.thereIsSIM) {
        goToStepForward();
      } else {
        self.manageStep();
      }
    };
    goToStepForward();

  },
  handleEvent: function n_handleEvent(event) {
    switch (window.location.hash) {
      case '#languages':
        UIManager.progressBar.className = 'step-state step-1';
        UIManager.mainTitle.innerHTML = _('language');
        break;
      case '#data_3g':
        UIManager.progressBar.className = 'step-state step-2';
        UIManager.mainTitle.innerHTML = _('3g');
        DataMobile.
          getStatus(UIManager.updateDataConnectionStatus.bind(UIManager));
        UIManager.activationScreen.classList.add('no-options');
        break;
      case '#wifi':
        UIManager.progressBar.className = 'step-state step-3';
        UIManager.mainTitle.innerHTML = _('wifi');
        UIManager.activationScreen.classList.remove('no-options');
        if (UIManager.navBar.classList.contains('secondary-menu')) {
          UIManager.navBar.classList.remove('secondary-menu');
          return;
        }
        // Avoid refresh when connecting
        WifiManager.scan(UIManager.renderNetworks);
        break;
      case '#date_and_time':
        UIManager.progressBar.className = 'step-state step-4';
        UIManager.mainTitle.innerHTML = _('dateAndTime');
        UIManager.activationScreen.classList.add('no-options');
        break;
      case '#import_contacts':
        UIManager.progressBar.className = 'step-state step-5';
        UIManager.mainTitle.innerHTML = _('importContacts');
        var fbOption = document.getElementById('fb_import');
        var simOption = document.getElementById('sim_import');
        // If there is SIM we activate import from SIM
        if (AppManager.thereIsSIM) {
          simOption.classList.remove('disabled');
        } else {
          simOption.classList.add('disabled');
        }
        // If we have 3G or Wifi activate FB import
        if (WifiManager.isConnected || DataMobile.isDataAvailable) {
          fbOption.classList.remove('disabled');
        } else {
          fbOption.classList.add('disabled');
        }
        break;
      case '#welcome_firefox':
        UIManager.progressBar.className = 'step-state step-6';
        UIManager.mainTitle.innerHTML = _('firefoxPrivacyChoices');
        break;
      case '#about-your-rights':
        UIManager.progressBar.className = 'step-state step-6';
        UIManager.navBar.classList.add('back-only');
        break;
      case '#about-your-privacy':
        UIManager.progressBar.className = 'step-state step-6';
        UIManager.navBar.classList.add('back-only');
        break;
      default:
        break;
    }
  },
  manageStep: function manageStep() {
    if (steps[this.currentStep].onlyForward) {
      UIManager.navBar.classList.add('forward-only');
    } else {
      UIManager.navBar.classList.remove('forward-only');
    }
    window.location.hash = steps[this.currentStep].hash;
  }
};
