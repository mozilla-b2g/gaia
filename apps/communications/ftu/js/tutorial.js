'use strict';
/*
  Steps of the First Time Usage App
*/
var tutorialSteps = {
  1: {
    hash: '#step1',
    key: 'step1',
    image: 'css/images/tutorial/1.png'
  },
  2: {
    hash: '#step2',
    key: 'step2',
    image: 'css/images/tutorial/2.png'
  },
  3: {
    hash: '#step3',
    key: 'step3',
    image: 'css/images/tutorial/3.png'
  },
  4: {
    hash: '#step4',
    key: 'step4',
    image: 'css/images/tutorial/4.png'
  },
  5: {
    hash: '#step5',
    key: 'step5',
    image: 'css/images/tutorial/5.png'
  },
  6: {
    hash: '#step6',
    key: 'step6',
    image: 'css/images/tutorial/6.png'
  },
  7: {
    hash: '#step7',
    key: 'step7',
    image: 'css/images/tutorial/7.png'
  },
  8: {
    hash: '#step8',
    key: 'step8',
    image: 'css/images/tutorial/8.png'
  },
  9: {
    hash: '#step9',
    key: 'step9',
    image: 'css/images/tutorial/9.png'
  },
  10: {
    hash: '#step10',
    key: 'step10',
    image: 'css/images/tutorial/10.png'
  }
};

var Tutorial = {
  get tutorialNavBar() {
    delete this.tutorialNavBar;
    return this.tutorialNavBar = document.getElementById('tutorialNavBar');
  },
  get tutorialScreen() {
    delete this.tutorialScreen;
    return this.tutorialScreen = document.getElementById('tutorial');
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
    if (this.currentStep > this.numTutorialSteps) {
      Tutorial.tutorialScreen.classList.remove('show');
      Tutorial.tutorialFinish.classList.add('show');
      return;
    }
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
    if (this.currentStep > 1) {
      this.tutorialNavBar.classList.remove('forward-only');
    } else {
      this.tutorialNavBar.classList.add('forward-only');
    }
    window.location.hash = tutorialSteps[this.currentStep].hash;
  }
};
