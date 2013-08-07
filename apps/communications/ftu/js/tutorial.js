'use strict';
/*
  Steps of the First Time Usage App
*/
var tutorialSteps = {
  1: {
    hash: '#step1',
    key: 'tutorial-step1',
    image: 'css/images/tutorial/1.png'
  },
  // On bug 901041 we erased the real second step, but didn't change the strings
  // To be solved on bug 902487
  2: {
    hash: '#step2',
    key: 'tutorial-step3',
    image: 'css/images/tutorial/2.png'
  },
  3: {
    hash: '#step3',
    key: 'tutorial-step4',
    image: 'css/images/tutorial/3.png'
  },
  4: {
    hash: '#step4',
    key: 'tutorial-step5',
    image: 'css/images/tutorial/4.png'
  }
};

var Tutorial = {
  get tutorialNavBar() {
    delete this.tutorialNavBar;
    return this.tutorialNavBar = document.getElementById('tutorialNavBar');
  },
  get tutorialScreen() {
    delete this.tutorialScreen;
    return this.tutorialScreen = document.getElementById('tutorial-screen');
  },
  get tutorialFinish() {
    delete this.tutorialFinish;
    return this.tutorialFinish = document.getElementById('tutorialFinish');
  },
  numTutorialSteps: Object.keys(tutorialSteps).length,
  currentStep: 1,
  init: function n_init() {
    var self = this;
    var forward = document.getElementById('forwardTutorial');
    var back = document.getElementById('backTutorial');
    forward.addEventListener('click', this.forward.bind(this));
    back.addEventListener('click', this.back.bind(this));

    this.tutorialFinish.addEventListener('click', function ftuEnd() {
      self.tutorialFinish.removeEventListener('click', ftuEnd);
      WifiManager.finish();
      window.close();
    });
    window.addEventListener('hashchange', this);
    window.location.hash = tutorialSteps[this.currentStep].hash;
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
    var root = window.location.hash.replace('#', '');
    var headerID = root + 'Header';
    var imgID = root + 'Img';
    // Update header with right locale
    var localeKey = tutorialSteps[this.currentStep].key;
    document.getElementById(headerID).innerHTML = _(localeKey);
    // Update img with right src
    document.getElementById(imgID).src = tutorialSteps[this.currentStep].image;

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
    } else {
      UIManager.tutorialProgress.className =
        'step-state step-' + this.currentStep;
      window.location.hash = tutorialSteps[this.currentStep].hash;
    }
  }
};
