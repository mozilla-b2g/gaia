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
      'phone-type' : [
        {type: 'mobile', value: 'Mobile'},
        {type: 'home', value: 'Home'},
        {type: 'work', value: 'Work'},
        {type: 'personal', value: 'Personal'},
        {type: 'faxHome', value: 'FaxHome'},
        {type: 'faxOffice', value: 'Fax Office'},
        {type: 'faxOther', value: 'Fax Other'},
        {type: 'other', value: 'Other'}
      ],
      'email-type' : [
        {type: 'personal', value: 'Personal'},
        {type: 'home', value: 'Home'},
        {type: 'work', value: 'Work'}
      ],
      'address-type' : [
        {type: 'home', value: 'Home'},
        {type: 'work', value: 'Work'}
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
  navigation: new MockNavigationStack(),
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
