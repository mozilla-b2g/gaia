'use strict';

var Feedback = {
  dogfoodid: null,

  init: function fb_init() {
    var filename = 'local/dogfoodid';
    var storage = navigator.getDeviceStorage('apps');
    var done = document.getElementById('done');

    if (storage) {
      var request = storage.get(filename);
      request.addEventListener('success', this.getSuccess.bind(this));
    }

    asyncStorage.getItem('contact', function getAsset(value) {
      var contact = value;
      if (!contact) {
        return;
      }
      document.getElementById('contact').value = value;
    });

    done.addEventListener('click', this.send.bind(this));
  },

  getSuccess: function fb_getSuccess(e) {
    var reader = new FileReader();
    reader.readAsText(e.target.result);
    reader.addEventListener('load', (function(evt) {
      this.dogfoodid = evt.target.result;
    }).bind(this));
  },

  reset: function fb_reset() {
    document.getElementById('feedback-textarea').value = '';
  },

  send: function fb_send() {
    if (!navigator.onLine) {
      window.alert(navigator.mozL10n.get('no-internet'));
      return;
    }

    var contact = document.getElementById('contact').value;

    asyncStorage.setItem('contact', contact, (function setContact() {
      var formData = new FormData();
      formData.append('build_id', navigator.buildID);

      var comment = document.getElementById('feedback-textarea');
      formData.append('comment', comment.value);

      if (this.dogfoodid)
        formData.append('asset_tag', this.dogfoodid);

      if (contact)
        formData.append('contact', contact);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://b2gtestdrivers.allizom.org/comments');
      xhr.send(formData);

      this.reset();
    }).bind(this));
  }
};

window.addEventListener('load', function fbLoad(evt) {
  window.removeEventListener('load', fbLoad);
  Feedback.init();
});
