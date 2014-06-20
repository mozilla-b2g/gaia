'use strict';
/* global BaseCollection */
/* global Contextmenu */
/* global ViewApps */
/* global ViewBgImage */
/* global ViewEditMode */
/* global Promise */

(function(exports) {

  var elements = {
    header: document.getElementById('header'),
    close: document.getElementById('close'),
    name: document.getElementById('name')
  };

  function HandleView(activity) {
    loading();

    // set collection name to header
    elements.name.textContent = activity.source.data.name;

    // set wallpaper behind header
    getWallpaperImage().then(function(src) {
      elements.header.style.backgroundImage = 'url(' + src + ')';
    });

    // close button listener
    elements.close.addEventListener('click', function close() {
      activity.postResult('close');
    });

    // create collection object
    var collection = BaseCollection.create(activity.source.data);

    loading(false);

    /* jshint -W031 */
    new Contextmenu(collection);
    new ViewApps(collection);
    new ViewBgImage(collection);
    new ViewEditMode(collection);
  }

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    if (activity.source.name === 'view-collection') {
      HandleView(activity);
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
