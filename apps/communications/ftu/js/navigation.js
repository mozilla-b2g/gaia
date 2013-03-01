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
  previousStep: 1,
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

  backFromIframe: function n_backFromIframe() {
    if (window.location.hash === this.externalUrlLoaderSelector) {
      window.history.back();
      // iframes are modifying history as well
      setTimeout(this.backFromIframe, 0);
    }
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
        UIManager.activationScreen.classList.remove('show');
        UIManager.finishScreen.classList.add('show');
        Tutorial.init();
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
      case '#date_and_time':
        UIManager.mainTitle.innerHTML = _('dateAndTime');
        break;
      case '#import_contacts':
        UIManager.mainTitle.innerHTML = _('importContacts3');
        // Enabling or disabling SIM import depending on card status
        SimManager.checkSIMButton();

        // If we have 3G or Wifi activate FB import
        var fbState;
        if (!WifiManager.api) {
          // Desktop
          FacebookIntegration.checkFbImport('enabled');
          return;
        }
        if (WifiManager.api.connection.status === 'connected' ||
            DataMobile.isDataAvailable) {
          fbState = 'enabled';
        } else {
          fbState = 'disabled';
        }
        FacebookIntegration.checkFbImport(fbState);
        break;
      case '#welcome_browser':
        UIManager.mainTitle.innerHTML = _('browserPrivacyChoices');
        break;
      case '#browser_privacy':
        UIManager.progressBar.className = 'step-state step-7';
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
    // Manage step state (dinamically change)
    var className = 'step-state step-';
    if (this.skipped && this.currentStep > 2) {
      className += (this.currentStep - 1) + ' less-steps';
    } else {
      className += this.currentStep;
    }
    UIManager.progressBar.className = className;

    // Managing options button
    if (this.currentStep != 3) { //wifi
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
    // Substitute button content on last step
    var nextButton = document.getElementById('forward');
    var innerNode = nextButton.childNodes[1];
    if (this.currentStep == numSteps) {
      nextButton.dataset.l10nId = 'done';
      nextButton.textContent = _('done');
    } else {
      nextButton.dataset.l10nId = 'navbar-next';
      nextButton.textContent = _('navbar-next');
    }
    nextButton.appendChild(innerNode);
    // Change hash to the right location
    window.location.hash = futureLocation.hash;
    // SIM card management
    if (futureLocation.requireSIM) {
      SimManager.handleCardState(function check_cardState(response) {
        self.skipped = false;
        if (!response) {
          self.skipStep();
        }
      });
    }
  }
};
