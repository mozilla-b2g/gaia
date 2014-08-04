'use strict';
/* global HandleCreate */
/* global HandleView */
/* global NativeInfo */
/* global eme */

(function() {

  eme.init().then(function() {
    NativeInfo.setup();
  });

  var activity = {
    source: {
      data: {
        categoryId: 207, // games
        name: 'Games'
      }
    },
    postResult: function() {},
    postError: function() {}
  };

  document.getElementById('clear').addEventListener('click',
    function () {
      document.getElementById('collections-select').innerHTML = '';
      document.getElementById('icons').innerHTML = '';
      document.getElementById('bgimage').src = '.';
    });

  document.getElementById('create-collection').addEventListener('click',
    function() {
      activity.source.name = 'create-collection';
      HandleCreate(activity);
    });

  document.getElementById('view-collection').addEventListener('click',
    function() {
      activity.source.name = 'view-collection';
      HandleView(activity);
    });
})();
