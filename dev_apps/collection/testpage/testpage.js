(function() {
  var activity = {
    source: {
      categoryId: 207 // games
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
      HandleCreate(activity);
    });

  document.getElementById('view-collection').addEventListener('click',
    function() {
      Activities['view-collection'](activity);
    });
})();
