'use strict';

var fb = this.fb || {};

fb.resolver = function(item, loader) {
  var FB_SCRIPTS_NEEDED = [
    '/shared/js/fb/fb_request.js',
    '/shared/js/fb/fb_data_reader.js',
    '/shared/js/fb/fb_reader_utils.js'
  ];

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
            // Prevents any kind of race condition while rendering favs
            // (bug 937205)
            if (!item.querySelector('img[data-src]')) {
              contacts.List.renderPhoto(item, id);
              document.dispatchEvent(new CustomEvent('onupdate'));
            }
            else {
              var imgEle = item.querySelector('img[data-src]');
              var src = imgEle.dataset.src;
              var photoUrl = contacts.List.getPhotoUrl(id);
              // Guarantees that img keeps updated with the cache (bug 937205)
              if (src !== photoUrl) {
                window.console.warn('Photo URL changed');
                imgEle.dataset.src = photoUrl;
                item.visited = false;
              }
              loader.defaultLoad(item);
            }
          }
          else if (contacts.List.updatePhoto(fbData, id)) {
            contacts.List.renderPhoto(item, id);
            document.dispatchEvent(new CustomEvent('onupdate'));
          }

          item.dataset.status = 'loaded';

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
