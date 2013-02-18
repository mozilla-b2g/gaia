'use strict';

var fb = this.fb || {};

var FB_SCRIPTS_NEEDED = ['/contacts/js/fb/fb_contact_utils.js',
                         '/contacts/js/fb/fb_data.js'];

fb.resolver = function(item, loader) {
  var status = item.dataset.status;
  var isFbContact = 'fbUid' in item.dataset;

  if (isFbContact && status !== 'pending' && status !== 'loaded') {
    item.dataset.status = 'pending';
    
    LazyLoader.load(FB_SCRIPTS_NEEDED, function() {
      var fbReq = fb.contacts.get(item.dataset.fbUid);
      fbReq.onsuccess = function() {
        var photo = fbReq.result.photo;
        if(photo && photo[0]) {
          var photoTemplate = document.createElement('aside');
          photoTemplate.className = 'pack-end';
          var image = document.createElement('img');
          photoTemplate.appendChild(image);
          image.dataset.src = window.URL.createObjectURL(photo[0]);
          var itemAnchor = item.firstElementChild;
          itemAnchor.insertBefore(photoTemplate, itemAnchor.firstElementChild);
          item.dataset.status = 'loaded';
          document.dispatchEvent(new CustomEvent('onupdate'));
        }
        else {
          item.dataset.status = 'loaded';
        }

        // The organization is also loaded
        var org = fbReq.result.org;
        if(Array.isArray(org)) {
          if(org[0]) {
            var meta = itemAnchor.lastChild.lastChild;
            meta.textContent = org[0];
          }
        }
      }

      fbReq.onerror = function() {
        item.dataset.status = 'error';
      }
   });
  }
  else if(status === 'loaded' || !isFbContact) {
    loader.defaultLoad(item);
  }
}
