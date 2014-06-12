'use strict';
/* global BaseCollection */
/* global Contextmenu */
/* global ViewApps */
/* global ViewBgImage */
/* global Promise */
/* global eme */

(function(exports) {

  var elements = {
    header: document.getElementById('header'),
    close: document.getElementById('close'),
    name: document.getElementById('name')
  };

  function HandleView(activity) {
    var collection = BaseCollection.create(activity.source.data);

    loading(false);

    var categoryId = collection.categoryId;
    var query = collection.query;
    eme.log('view collection', categoryId ? ('categoryId: ' + categoryId)
                                          : ('query: ' + query));

    elements.close.addEventListener('click', function close() {
      activity.postResult('close');
    });

    /* jshint -W031 */
    new Contextmenu(collection);
    new ViewApps(collection);
    new ViewBgImage(collection);
  }

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    if (activity.source.name === 'view-collection') {
      // set collection name to header
      elements.name.textContent = activity.source.data.name;

      // set wallpaper behind header
      getWallpaperImage().then(function(src) {
        elements.header.style.backgroundImage = 'url(' + src + ')';
      });

      loading();

      eme.init().then(function ready() {
        HandleView(activity);
      });
    }
  });

  function getWallpaperImage() {
    return new Promise(function convert(resolve, reject) {
      var req = navigator.mozSettings.createLock().get('wallpaper.image');
      req.onsuccess = function image_onsuccess() {
        var image = req.result['wallpaper.image'];
        if (image instanceof Blob) {
          image = URL.createObjectURL(image);
        }

        resolve(image);
      };
      req.onerror = reject;
    });
  }

  // toggle progress indicator
  function loading(should) {
    document.body.dataset.loading = should !== false;
  }

  // exporting handler so we can trigger it from testpage.js
  // without mozActivities since we can't debug activities in app manager
  exports.HandleView = HandleView;

}(window));
