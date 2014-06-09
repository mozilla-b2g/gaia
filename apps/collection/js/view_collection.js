'use strict';
/* global BaseCollection */
/* global Contextmenu */
/* global Promise */

(function(exports) {

  var eme = exports.eme;

  var grid = document.getElementById('grid');

  var elements = {
    content: document.getElementById('content'),
    header: document.getElementById('header'),
    close: document.getElementById('close'),
    name: document.getElementById('name')
  };

  function HandleView(activity) {

    var collection = BaseCollection.create(activity.source.data);
    collection.render(grid);

    /* jshint -W031 */
    new Contextmenu(collection);

    function error(e) {
      eme.log(e);
      alert('view-collection error', e);
      activity.postError(e);
    }

    function fail(e) {
      eme.log(e);
      alert('view-collection fail', e);
      activity.postError(e);
    }

    var categoryId = collection.categoryId;
    var query = collection.query;

    elements.close.addEventListener('click', function close() {
      activity.postResult('close');
    });

    eme.log('view collection', categoryId ? ('categoryId: ' + categoryId)
                                          : ('query: ' + query));

    eme.api.Apps.search({categoryId: categoryId, query: query, iconFormat: 20})
      .then(function success(searchResponse) {

        var webResults = [];

        searchResponse.response.apps.forEach(function each(webapp) {
          webResults.push({
            id: webapp.id, // e.me app id (int)
            name: webapp.name,
            url: webapp.appUrl,
            icon: webapp.icon,
            clipIcon: true
          });
        });

        collection.webResults = webResults;
        collection.render(grid);
      }, error)
      .catch(fail);


    eme.api.Search.bgimage({categoryId: categoryId, query: query})
      .then(function success(bgResponse) {
        var image = bgResponse.response.image;
        if (image) {
          var src = image.data;
          if (/image\//.test(image.MIMEType)) {  // base64 image data
            src = 'data:' + image.MIMEType + ';base64,' + image.data;
          }

          elements.content.style.backgroundImage = 'url(' + src + ')';
        } else {
          // TODO show default image?
        }
      }, error)
      .catch(fail);
  }

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    if (activity.source.name === 'view-collection') {
      // set collection name to header
      elements.name.textContent = activity.source.data.name;

      // set wallpaper behind header
      getWallpaperImage().then(function(src) {
        elements.header.style.backgroundImage = 'url(' + src + ')';
      });

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

  // exporting handler so we can trigger it from testpage.js
  // without mozActivities since we can't debug activities in app manager
  exports.HandleView = HandleView;

}(window));
