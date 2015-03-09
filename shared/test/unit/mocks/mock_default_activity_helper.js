'use strict';

window.MockDefaultActivityHelper = {

  getDefaultConfig: function(name, type) {
    if (name === 'testactivity' && type === 'testtype') {
      return {
        name: 'testactivity',
        type: ['testtype']
      };
    } else {
      return undefined;
    }
  },

  getDefaultAction: function(name, type) {
    if (name === 'testactivity' && type === 'testtype') {
      return {
        'aa': 'kk'
      };
    } else {
      return undefined;
    }
  },

  setDefaultAction: function(name, type, choice) {

  }

};
