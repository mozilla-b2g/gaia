'use strict';

var MockContactDataManager = {
  result: [{
    id: '000000',
    name: ['John'],
    tel: [
      {
        type: 'mobile',
        value: '111111111'
      },
      {
        type: 'home',
        value: '222222222'
      }
    ]
  }],

  getContactData: function cm_getContactData(number, callback) {
    callback(this.result);
  }
};
