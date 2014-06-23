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

  function getLocalizedName(collection) {
    // l10n prefix taken from /shared/locales/collection_categories
    var l10nId = 'collection-categoryId-' + collection.categoryId;
    return navigator.mozL10n.get(l10nId) || collection.name;
  }

  function updateTitle(element, collection) {
    element.textContent = getLocalizedName(collection);
  }

  function HandleView(activity) {
    loading();

    var data = activity.source.data;

    // XXX: in 2.1 we can use a better approach of just setting the l10n id
    //      see Bug 992473
    var l10nUpdateHander = updateTitle.bind(this, elements.name, data);
    navigator.mozL10n.ready(l10nUpdateHander);
    window.addEventListener('localized', l10nUpdateHander);

    // set wallpaper behind header
    getWallpaperImage().then(function(src) {
      elements.header.style.backgroundImage = 'url(' + src + ')';
    });

    // close button listener
    elements.close.addEventListener('click', function close() {
      activity.postResult('close');
    });

    // create collection object
    var collection = BaseCollection.create(data);

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
