'use strict';
/*
  Steps of the First Time Usage App
*/
var steps = {
  1: {
    onlyForward: true,
    hash: '#languages'
  },
  2: {
    onlyForward: false,
    hash: '#wifi'
  },
  3: {
    onlyForward: false,
    hash: '#date_and_time'
  },
  4: {
    onlyForward: false,
    hash: '#import_contacts'
  },
  5: {
    onlyForward: false,
    hash: '#welcome_firefox'
  },
  6: {
    onlyForward: false,
    hash: '#firefox_privacy'
  }
};

// Retrieve number of steps for navigation
var numSteps = Object.keys(steps).length;

var Navigation = {
  currentStep: 1,
  get forward() {
    delete this.forward;
    return this.forward = document.getElementById('forward');
  },
  get back() {
    delete this.back;
    return this.back = document.getElementById('back');
  },
  init: function n_init() {
    this.forward.addEventListener('click', this);
    this.back.addEventListener('click', this);
    window.addEventListener('hashchange', this);
  },
  handleEvent: function n_handleEvent(event) {
    switch (event.type) {
      case 'click':
        switch (event.target.id) {
          case 'forward':
            this.currentStep++;
            if (this.currentStep > numSteps) {
              UIManager.activationScreen.classList.remove('show');
              UIManager.finishScreen.classList.add('show');
              return;
            }
            this.manageStep();
            break;
          case 'back':
            var currentStep = steps[this.currentStep];
            if (window.location.hash != currentStep.hash) {
              UIManager.navBar.classList.remove('back-only');
              UIManager.navBar.classList.remove('secondary-menu');
              window.history.back();
            } else {
              this.currentStep--;
              this.manageStep();
            }
            break;
        }
        break;
      case 'hashchange':
        switch (window.location.hash) {
          case '#languages':
            UIManager.progressBar.value = 20;
            UIManager.mainTitle.innerHTML = _('language');
            UIManager.activationScreen.classList.add('no-options');
            break;
          case '#wifi':
            UIManager.progressBar.value = 40;
            UIManager.mainTitle.innerHTML = _('wifi');
            UIManager.activationScreen.classList.remove('no-options');
            UIManager.navBar.classList.remove('secondary-menu');
            WifiManager.scan(UIManager.renderNetworks);
            break;
          case '#date_and_time':
            UIManager.progressBar.value = 60;
            UIManager.mainTitle.innerHTML = _('dateAndTime');
            UIManager.activationScreen.classList.add('no-options');
            break;
          case '#import_contacts':
            UIManager.progressBar.value = 80;
            UIManager.mainTitle.innerHTML = _('importContacts');
            var fbOption = document.getElementById('fb_import').parentNode;
            if (WifiManager.isConnected) {
              fbOption.classList.remove('disabled');
            } else {
              fbOption.classList.add('disabled');
            }
            break;
          case '#welcome_firefox':
            UIManager.progressBar.value = 90;
            UIManager.mainTitle.innerHTML = _('firefoxPrivacyChoices');
            break;
          case '#about-your-rights':
            UIManager.progressBar.value = 90;
            UIManager.navBar.classList.add('back-only');
            break;
          case '#about-your-privacy':
            UIManager.progressBar.value = 90;
            UIManager.navBar.classList.add('back-only');
            break;
          default:
            break;
        }
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
