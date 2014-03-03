'use strict';

var Tutorial = {
  tutorialSteps: {},
  numTutorialSteps: null,
  currentStep: 1,
  imagesLoaded: [],
  layout: 'tiny',
  init: function n_init() {
    this.layout = (ScreenLayout && ScreenLayout.getCurrentLayout) ?
        ScreenLayout.getCurrentLayout() : 'tiny';

    this.tutorialSteps = TutorialSteps.get();
    this.numTutorialSteps = Object.keys(this.tutorialSteps).length;

    // register elements after dynamic properties got set
    this.initElements();

    this.forwardTutorial.addEventListener('click', this.forward.bind(this));
    this.backTutorial.addEventListener('click', this.back.bind(this));

    this.handleHowToExit();
    window.addEventListener('hashchange', this);
  },
  initElements: function() {

    var self = this;
    var elementIds = [
      'forward-tutorial', 'back-tutorial',
      'tutorial-nav-bar', 'tutorial-screen'
    ];

    for (var i = 1; i <= 8; i++) {
      elementIds.push('step' + i + 'Img');
      elementIds.push('step' + i + 'Header');
    }

    elementIds.forEach(function(elementId) {
      self[Utils.camelCase(elementId)] = document.getElementById(elementId);
    });

    // other dynamic elements will be registered here
    this.tutorialFinish = document.getElementById(
      'tutorial-finish-' + this.layout);
  },
  back: function n_back(event) {
    this.currentStep--;
    this.manageStep();
  },
  forward: function n_forward(event) {
    this.currentStep++;
    this.manageStep();
  },
  handleEvent: function n_handleEvent(event) {

    // Retrieve header to update
    var step = window.location.hash.replace('#', '');
    var headerID = step + 'Header';
    var imageID = step + 'Img';

    // Update header with right locale
    var localeKey = this.tutorialSteps[this.currentStep].key;
    this[headerID].innerHTML = _(localeKey);

    // Make sure we show image when loaded
    if (Tutorial.imagesLoaded.indexOf(imageID) === -1) {
      this[imageID].classList.add('hide');
      this[imageID].addEventListener('load', function onLoad() {
        this.removeEventListener('load', onLoad);
        this.classList.remove('hide');
        Tutorial.imagesLoaded.push(imageID);
      });
    }

    this[imageID].src = this.tutorialSteps[this.currentStep].image;
  },
  handleHowToExit: function() {
    var self = this;

    /*
     * For mobile devices, we will have to click on the last button
     * to get out of FTU.
     *
     * But for large devices, because the flow totally got changed with
     * latest UX design, we leave that part in manageStep
     */
    if (this.layout === 'tiny') {
      this.tutorialFinish.addEventListener('click', function ftuEnd() {
        self.tutorialFinish.removeEventListener('click', ftuEnd);
        self.exit();
      });
    }
  },
  exit: function() {
    WifiManager.finish();
    window.removeEventListener('hashchange', this);
    window.close();
  },
  jumpTo: function jumpTo(index) {
    if (index <= this.numTutorialSteps + 1 && index >= 1) {
      this.currentStep = index;
      this.manageStep();
    }
  },
  jumpToExitStep: function jumpToLastStep() {
    this.jumpTo(this.numTutorialSteps + 1);
  },
  manageStep: function manageStep() {
    // If first step, we can't go back from here
    if (this.currentStep > 1) {
      this.tutorialNavBar.classList.remove('forward-only');
    } else {
      this.tutorialNavBar.classList.add('forward-only');
    }
    // If we finish tutorial, hide and show final screen
    if (this.currentStep > this.numTutorialSteps) {
      Tutorial.tutorialScreen.classList.remove('show');
      Tutorial.tutorialFinish.classList.add('show');

      // for large devices, we have to use IAC to tell system ftu is done
      if (this.layout !== 'tiny') {
        navigator.mozApps.getSelf().onsuccess = function(evt) {
          var app = evt.target.result;
          app.connect('ftucomms').then(function onConnAccepted(ports) {
            ports.forEach(function(port) {
              port.postMessage('done');
            });
          }, function onConnRejected(reason) {
            console.log('FTU is rejected');
            console.log(reason);
          });
        };
      }
    } else {
      UIManager.tutorialProgress.className =
        'step-state step-' + this.currentStep;
      window.location.hash = this.tutorialSteps[this.currentStep].hash;
    }
  }
};
