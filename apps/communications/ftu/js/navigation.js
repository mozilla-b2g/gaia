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
    hash: '#welcome_browser',
    requireSIM: false
  },
  7: {
    onlyForward: false,
    hash: '#browser_privacy',
    requireSIM: false
  }
};

// Retrieve number of steps for navigation
var numSteps = Object.keys(steps).length;

var Navigation = {
  currentStep: 1,
  externalUrlLoaderSelector: '#external-url-loader',

  init: function n_init() {
    var forward = document.getElementById('forward');
    var back = document.getElementById('back');
    forward.addEventListener('click', this.forward.bind(this));
    back.addEventListener('click', this.back.bind(this));
    window.addEventListener('hashchange', this);
    UIManager.activationScreen.addEventListener('click',
        this.handleExternalLinksClick.bind(this));

    var browserFrame = document.createElement('iframe');
    browserFrame.setAttribute('mozbrowser', 'true');
    browserFrame.classList.add('external');

    var container = document.querySelector(this.externalUrlLoaderSelector);
    container.appendChild(browserFrame);

    this.externalIframe = browserFrame;

    // this will be called by setTimeout, so it's easier if it's already bound
    this.backFromIframe = this.backFromIframe.bind(this);
  },
  back: function n_back(event) {
    var currentStep = steps[this.currentStep];
    var actualHash = window.location.hash;
    if (actualHash != currentStep.hash) {
      if (actualHash === this.externalUrlLoaderSelector) {
        this.externalIframe.src = 'about:blank';
        this.backFromIframe();
      } else {
        window.history.back();
      }
    } else {
      var self = this;
      var goToStep = function() {
        self.currentStep--;
        if (self.currentStep > 0) {
          var followingStep = steps[self.currentStep];
          if (followingStep.requireSIM && !SimManager.available()) {
            goToStep();
          } else {
            self.manageStep();
          }
        }
      };
      goToStep();
    }
  },

  backFromIframe: function n_backFromIframe() {
    if (window.location.hash === this.externalUrlLoaderSelector) {
      window.history.back();

      // iframes are modifying history as well
      setTimeout(this.backFromIframe, 0);
    }
  },

  forward: function n_forward(event) {
    var self = this;
    var goToStepForward = function() {
      self.currentStep++;
      if (self.currentStep > numSteps) {
        UIManager.activationScreen.classList.remove('show');
        UIManager.finishScreen.classList.add('show');
        Tutorial.init();
        return;
      }
      var followingStep = steps[self.currentStep];
      if (followingStep.requireSIM && !SimManager.available()) {
        goToStepForward();
      } else {
        self.manageStep();
      }
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
    this.externalIframe.src = href;
    document.location.hash = this.externalUrlLoaderSelector;

    if (title) {
      // title is already localized
      UIManager.mainTitle.innerHTML = title;
    }
  },



  handleEvent: function n_handleEvent(event) {
    var actualHash = window.location.hash;

    switch (actualHash) {
      case '#languages':
        UIManager.progressBar.className = 'step-state step-1';
        UIManager.mainTitle.innerHTML = _('language');
        // Hide refresh button in case we end up here coming back from wifi
        UIManager.activationScreen.classList.add('no-options');
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
        UIManager.mainTitle.innerHTML = _('importContacts2');
        var fbOption = document.getElementById('fb_import');
        var simOption = document.getElementById('sim-import-button');
        // If there is an unlocked SIM we activate import from SIM
        if (SimManager.available()) {
          simOption.classList.remove('disabled');
        } else {
          simOption.classList.add('disabled');
        }
        // If we have 3G or Wifi activate FB import
        if (WifiManager.api.connection.status === 'connected' ||
            DataMobile.isDataAvailable) {
          fbOption.classList.remove('disabled');
        } else {
          fbOption.classList.add('disabled');
        }
        break;
      case '#welcome_browser':
        UIManager.progressBar.className = 'step-state step-6';
        UIManager.mainTitle.innerHTML = _('browserPrivacyChoices');
        break;
      case '#about-your-rights':
      case '#about-your-privacy':
      case '#sharing-performance-data':
        UIManager.mainTitle.innerHTML = _('browserPrivacyChoices');
      case this.externalUrlLoaderSelector:
        UIManager.progressBar.className = 'hidden';
        UIManager.navBar.classList.add('back-only');
        break;
    }

    if (this.currentStep <= numSteps &&
        steps[this.currentStep].hash === actualHash) {
      UIManager.navBar.classList.remove('back-only');
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
