'use strict';

var MockContacts = {
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
      'phone-type': [
        {value: 'mobile'},
        {value: 'home'},
        {value: 'work'},
        {value: 'personal'},
        {value: 'faxHome'},
        {value: 'faxOffice'},
        {value: 'faxOther'},
        {value: 'another'}
      ],
      'email-type': [
        {value: 'personal'},
        {value: 'home'},
        {value: 'work'}
      ],
      'address-type': [
        {value: 'home'},
        {value: 'work'}
      ]
    };
  },
  hideOverlay: function() {
  },
  loadFacebook: function(cb) {
    cb();
  },
  asyncScriptsLoaded: true,
  cardStateChanged: function() {
  },
  extServices: {
    importLive: function() {},
    importGmail: function() {}
  },
  navigation: {
    go: function() {},
    home: function() {}
  },
  checkCancelableActivity: function() {},
  cancel: function() {},
  confirmDialog: function() {
    ConfirmDialog.show.apply(ConfirmDialog, arguments);
  },
  utility: function(view, callback) {
    callback();
  },
  view: function(view, callback) {
    callback();
  },
  showOverlay: function(title, id) {
    return {
      'setClass': function(clazz) {},
      'setHeaderMsg': function(msg) {},
      'setTotal': function(total) {},
      'update': function() {}
    };
  },
  showStatus: function(status) {}
};
