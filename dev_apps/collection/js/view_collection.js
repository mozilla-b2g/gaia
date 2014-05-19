'use strict';
/* global Bookmark */
/* global Promise */

(function(exports) {

  var eme = exports.eme;

  var grid = document.getElementById('grid');

  var elements = {
    bgimage: document.getElementById('bgimage'),
    close: document.getElementById('close'),
    name: document.getElementById('name')
  }

  function HandleView(activity) {

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


    var categoryId = activity.source.data.categoryId;
    var query = activity.source.data.query;
    var name = activity.source.data.name;

    elements.name.textContent = name;
    elements.close.addEventListener('click', function close() {
      activity.postResult('close');
    });

    eme.log('view collection', categoryId ? ('categoryId: ' + categoryId)
                                          : ('query: ' + query));

    eme.api.Apps.search({categoryId: categoryId, query: query, iconFormat: 20})
      .then(function success(searchResponse) {
        var webapps = searchResponse.response.apps.forEach(function each(webapp) {
          var webBookmark = new Bookmark({
            id: webapp.id, // e.me app id (int)
            name: webapp.name,
            url: webapp.appUrl,
            icon: webapp.icon,
            clipIcon: true
          });
          grid.add(webBookmark);

        });

        grid.render();
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

          elements.bgimage.style.backgroundImage = 'url(' + src + ')';
        } else {
          // TODO show default image?
        }
      }, error)
      .catch(fail);
  }

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    if (activity.source.name === 'view-collection') {
      eme.init().then(function ready() {
        HandleView(activity);
      });
    }
  });

  // exporting handler so we can trigger it from testpage.js
  // without mozActivities since we can't debug activities in app manager
  exports.HandleView = HandleView;

}(window));
