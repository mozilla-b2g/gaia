/* global DataMobile, SimManager, IccHelper,
          SdManager, UIManager, WifiManager, WifiUI,
          ImportIntegration,
          OperatorVariant */
/* exported Navigation */
(function(exports) {
'use strict';

const DOGFOODSETTING = 'debug.performance_data.dogfooding';

/*
  Steps of the First Time Usage App
*/
var steps = [
  {
    onlyForward: true,
    hash: '#languages',
    requireSIM: false
  },
  {
    onlyForward: false,
    hash: '#data_3g',
    requireSIM: true
  },
  {
    onlyForward: false,
    hash: '#wifi',
    requireSIM: false
  },
  {
    onlyForward: false,
    hash: '#date_and_time',
    requireSIM: false
  },
  {
    onlyForward: false,
    hash: '#geolocation',
    requireSIM: false
  },
  {
    onlyForward: false,
    hash: '#import_contacts',
    requireSIM: false
  },
  {
    onlyForward: false,
    hash: '#firefox_accounts',
    requireSIM: false
  },
  {
    onlyForward: false,
    hash: '#welcome_browser',
    requireSIM: false
  },
  {
    onlyForward: false,
    hash: '#browser_privacy',
    requireSIM: false
  }
];

exports.Navigation = {
  get stepCount() {
    return this._stepOrder ? this._stepOrder.length : 0;
  },
  currentStepIndex: 0,
  previousStepIndex: 0,
  simMandatory: false,
  skipMobileDataScreen: false,
  skipDateTimeScreen: false,
  tzInitialized: false,

  _stepsById: null,
  _stepOrder: null,

  init: function n_init() {
    this._stepOrder = [];
    this._stepsById = {};

    var settings = navigator.mozSettings;
    var forward = document.getElementById('forward');
    var back = document.getElementById('back');
    this._onForwardClick = this.forward.bind(this);
    this._onBackClick = this.back.bind(this);
    forward.addEventListener('click', this._onForwardClick);
    back.addEventListener('click', this._onBackClick);
    window.addEventListener('hashchange', this);
    this._onActivationScreenClick = this.handleExternalLinksClick.bind(this);
    UIManager.activationScreen.addEventListener('click',
      this._onActivationScreenClick);

    // register pre-defined steps in the oder they appear
    steps.forEach(step => {
      this.registerStep(step);
    });

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
        ports.forEach(port => port.postMessage('started'));
      }, function onConnRejected(reason) {
        console.warn('FTU navigation cannot use IAC: ' + reason);
      });
    };
  },

  uninit: function() {
    this._stepOrder = null;
    this._stepsById = null;
    this.currentStepIndex = 0;
    this.previousStepIndex = 0;
    this.ports = null;

    var forward = document.getElementById('forward');
    var back = document.getElementById('back');
    var activationScreen = UIManager && UIManager.activationScreen;

    if (forward && this._onForwardClick) {
      forward.removeEventListener('click', this._onForwardClick);
    }
    if (back && this._onBackClick) {
      back.removeEventListener('click', this._onBackClick);
    }
    if (activationScreen && this._onActivationScreenClick) {
      activationScreen.removeEventListener('click',
                                          this._onActivationScreenClick);
    }
    window.removeEventListener('hashchange', this);
  },

  registerStep: function(step) {
    if (!step.id) {
      step.id = step.hash.substring(1); // strip off '#' to make an id;
    }
    var id = step.id;
    this._stepsById[id] = step;
    var beforeStepIdx  = step.hasOwnProperty('beforeStep') ?
        this._stepOrder.indexOf(step.beforeStep) : -1;
    var afterStepIdx  = step.hasOwnProperty('afterStep') ?
        this._stepOrder.indexOf(step.afterStep) : -1;

    if (beforeStepIdx > -1) {
      this._stepOrder.splice(beforeStepIdx, 0, id);
    } else if (afterStepIdx > -1) {
      this._stepOrder.splice(afterStepIdx+1, 0, id);
    } else {
      this._stepOrder.push(id);
    }
  },

  stepAt: function(idx) {
    var stepId = this._stepOrder[idx];
    if (stepId) {
      return this._stepsById[stepId];
    }
  },
  indexOfStep: function(step) {
    var id = (typeof id === 'string') ? step.id : step;
    return this._stepOrder.indexOf(id);
  },

  back: function n_back(event) {
    var currentStep = this.stepAt(this.currentStepIndex);
    var actualHash = window.location.hash;
    if (actualHash != currentStep.hash) {
      window.history.back();
    } else {
      var self = this;
      var goToStep = function() {
        self.previousStepIndex = self.currentStepIndex;
        self.currentStepIndex--;
        if (self.currentStepIndex >= 0) {
          self.manageStep();
        }
      };
      goToStep();
    }
  },

  forward: function n_forward(event) {
    var self = this;
    var goToStepForward = function() {
      self.previousStepIndex = self.currentStepIndex;
      self.currentStepIndex++;
      if (self.currentStepIndex >= self.stepCount) {
        // Try to send Newsletter here
        UIManager.sendNewsletter(function newsletterSent(result) {
          if (result) { // sending process ok, we advance
            UIManager.activationScreen.classList.remove('show');
            UIManager.changeStatusBarColor(UIManager.DARK_THEME);
            UIManager.finishScreen.classList.add('show');
            UIManager.hideActivationScreenFromScreenReader();
          } else { // error on sending, we stay where we are
            self.currentStepIndex--;
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
        UIManager.mainTitle.setAttribute('data-l10n-id', 'language');
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

        // If we have 3G or Wifi activate online services import
        var onlineState;
        if (!WifiManager.api) {
          // Desktop
          ImportIntegration.checkImport('enabled');
          break;
        }

        onlineState = window.navigator.onLine ? 'enabled' : 'disabled';
        ImportIntegration.checkImport(onlineState);
        break;
      case '#firefox_accounts':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'firefox-accounts');
        break;
      case '#welcome_browser':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'aboutBrowser');

        // Initialize the share checkbox according to the preset value
        // of debug.performance_data.shared
        var sharePerformance = document.getElementById('share-performance');
        var settingName = sharePerformance.name;
        var settings = navigator.mozSettings;
        var req = settings && settings.createLock().get(settingName);
        if (req) {
          req.onsuccess = function() {
            sharePerformance.checked = req.result[settingName] || false;
          };
        }

        // If it's a dogfooder, we don't want them to disable the metrics.
        var dogfood = settings && settings.createLock().get(DOGFOODSETTING);
        if (dogfood) {
          dogfood.onsuccess = function() {
            if (dogfood.result[DOGFOODSETTING]) {
              sharePerformance.setAttribute('disabled', 'true');
            } else {
              sharePerformance.removeAttribute('disabled');
            }
          };
        }
        break;
      case '#browser_privacy':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'aboutBrowser');
        break;
      case '#SIM_mandatory':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'SIM_mandatory');
        break;
      case '#about-your-rights':
      case '#about-your-privacy':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'aboutBrowser');
        UIManager.navBar.classList.add('back-only');
        break;
      case '#sharing-performance-data':
        UIManager.mainTitle.setAttribute('data-l10n-id', 'aboutBrowser');
        UIManager.navBar.classList.add('back-only');
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
    var lastIndex = this.stepCount - 1;
    if (this.currentStepIndex <= lastIndex &&
        (this.stepAt(this.currentStepIndex).hash !== '#wifi')) {
      UIManager.activationScreen.classList.add('no-options');
    }

    // Managing nav buttons when coming back from out-of-steps (privacy)
    if (this.currentStepIndex <= lastIndex &&
        this.stepAt(this.currentStepIndex).hash === actualHash) {
      UIManager.navBar.classList.remove('back-only');
    }
  },

  /**
   * Posts IAC message about FTU steps passed.
   */
  postStepMessage: function n_postStepMessage(stepIndex) {
    if (!this.ports) {
      return;
    }
    var step = this.stepAt(stepIndex);
    this.ports.forEach(function(port) {
      port.postMessage({
        type: 'step',
        hash: step.hash
      });
    });
  },

  skipStep: function n_skipStep() {
    this.currentStepIndex = this.currentStepIndex +
                      (this.currentStepIndex - this.previousStepIndex);
    if (this.currentStepIndex <= 0) {
      this.previousStepIndex = this.currentStepIndex = 0;
    }
    if (this.currentStepIndex > this.stepCount) {
      this.previousStepIndex = this.currentStepIndex = this.stepCount;
    }
    this.manageStep();
  },

  manageStep: function n_manageStep() {
    var self = this;

    // If we moved forward in FTU, post iac message about progress.
    if (self.currentStepIndex > self.previousStepIndex) {
      self.postStepMessage(self.previousStepIndex);
    }

    //SV - We need remember if phone startup with SIM
    if (self.currentStepIndex >= self.stepCount) {
      OperatorVariant.setSIMOnFirstBootState();
    }

    // Reset skip screen flags at beginning of navigation
    if (self.currentStepIndex === 0) {
      self.skipMobileDataScreen = false;
    }

    // Retrieve future location
    var futureLocation = this.stepAt(self.currentStepIndex);

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
    if (this.stepAt(this.currentStepIndex).onlyForward) {
      UIManager.navBar.classList.add('forward-only');
    } else {
      UIManager.navBar.classList.remove('forward-only');
    }
    var nextButton = document.getElementById('forward');
    if (this.stepAt(this.currentStepIndex).onlyBackward) {
      nextButton.setAttribute('disabled', 'disabled');
    } else {
      nextButton.removeAttribute('disabled');
    }

    // Substitute button content on last step
    if (this.currentStepIndex === this.stepCount) {
      nextButton.setAttribute('data-l10n-id', 'done');
    } else {
      nextButton.setAttribute('data-l10n-id', 'navbar-next');
    }

    if (futureLocation.hash === '#firefox_accounts') {
      nextButton.setAttribute('data-l10n-id', 'skip');
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
          if (self.currentStepIndex > self.previousStepIndex) {
            self.skipMobileDataScreen = true;
          }
        }
      };

      // if we are navigating backwards, we do not want to
      // show the SIM unlock screens for the data_3g step
      var skipUnlockScreens = this.currentStepIndex < this.previousStepIndex;
      SimManager.handleCardState(check_cardState, skipUnlockScreens);
    }

    // Only show the Date & Time screen if we couldn't determine the
    // timezone from the network. (We assume that if we can
    // determine the timezone, we can determine the time too.)
    if (this.stepAt(this.currentStepIndex).hash === '#date_and_time') {
      if (!self.tzInitialized) {
        self.skipDateTimeScreen = !UIManager.timeZoneNeedsConfirmation;
      }

      if (self.skipDateTimeScreen) {
        self.postStepMessage(self.currentStepIndex);
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
    if ((futureLocation.hash === '#firefox_accounts' &&
         !navigator.onLine) ||
        (futureLocation.hash === '#firefox_accounts' &&
         UIManager.skipFxA)) {
      self.postStepMessage(self.currentStepIndex);
      self.skipStep();
    }
  }
};
})(window);
