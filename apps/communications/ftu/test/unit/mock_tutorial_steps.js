/* exported MockTutorialSteps */
'use strict';

var MockTutorialSteps = {
  'tiny': {
    'stepsCount': 1,
    1: {
      'hash': '#step1',
      'key': 'tutorial-step1-tiny-1',
      'image': 'css/images/tutorial/1_tiny.png'
    }
  },
  'large': {
    'stepsCount': 2,
    1: {
      'hash': '#step1',
      'key': 'tutorial-step1-large-1',
      'image': 'css/images/tutorial/1_large.png'
    },
    2: {
      'hash': '#step2',
      'key': 'tutorial-step2-large-2',
      'image': 'css/images/tutorial/2_large.png'
    }
  },
  get: function() {
    return this.tiny;
  }
};
