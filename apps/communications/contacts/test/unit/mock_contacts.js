'use strict';

var MockContactsApp = {
  getLength: function(prop) {
    return prop.length;
  },
  isEmpty: function(prop) {
    return false;
  },
  updatePhoto: function(photo, dest) {
    dest.setAttribute('backgroundImage', photo);
  },
  getTags: function() {
    return {
      'phone-type' : [
        {value: 'mobile'},
        {value: 'home'},
        {value: 'work'},
        {value: 'personal'},
        {value: 'faxHome'},
        {value: 'faxOffice'},
        {value: 'faxOther'},
        {value: 'another'}
      ],
      'email-type' : [
        {value: 'personal'},
        {value: 'home'},
        {value: 'work'}
      ],
      'address-type' : [
        {value: 'home'},
        {value: 'work'}
      ]
    };
  },
  hideOverlay: function() {
  },
  loadFacebook: function(cb) {
    cb();
  }
};
