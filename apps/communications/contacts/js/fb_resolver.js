'use strict';

var fb = this.fb || {};

fb.resolver = function(item, loader) {
  var FB_SCRIPTS_NEEDED = ['/contacts/js/fb/fb_contact_utils.js',
                         '/contacts/js/fb/fb_data.js'];

  var status = item.dataset.status;
  var isFbContact = 'fbUid' in item.dataset;
  var EMPTY_OBJ = {};

  if (isFbContact && status !== 'pending' && status !== 'loaded') {
    item.dataset.status = 'pending';

    LazyLoader.load(FB_SCRIPTS_NEEDED, function() {
      var fbReq = fb.contacts.get(item.dataset.fbUid);
      fbReq.onsuccess = function() {
        var fbData = fbReq.result;
        if (fbData) {
          var id = item.dataset.uuid;

          if (contacts.List.hasPhoto(id)) {
            loader.defaultLoad(item);
          }
          else if (contacts.List.updatePhoto(fbData, id)) {
            contacts.List.renderPhoto(item, id);
            item.dataset.status = 'loaded';
            document.dispatchEvent(new CustomEvent('onupdate'));
          }
          else {
            item.dataset.status = 'loaded';
          }

          // The organization is also loaded
          var contactObj = EMPTY_OBJ;
          // If there is no local org we render the FB org
          if (!item.querySelector('span.org')) {
            var org = fbData.org;
            if (Array.isArray(org)) {
              contactObj = {
                org: org
              };
            }
          }
          contacts.List.renderFbData(contactObj, item);
        }
        else {
          window.console.warn('FB Data could not be retrieved by the resolver',
                              'for UID: ', item.dataset.fbUid);
          item.dataset.status = 'loaded';
        }
      };

      fbReq.onerror = function() {
        item.dataset.status = 'error';
      };
   });
  }
  else if (status === 'loaded' || !isFbContact) {
    loader.defaultLoad(item);
  }
};
