/**
 * Special Homescreen App message behavior
 */
!function() {

  // Hack to disable context menus so we can move icons on the homescreen
  setTimeout(function() {

    function addListener(el) {
      el.addEventListener('contextmenu', function(e) {
        e.preventDefault();
      });
    }

    var allLists = window.document.querySelectorAll('ol');

    for (var i = 0, ilen = allLists.length; i < ilen; i++) {
      addListener(allLists[i]);
    }
  }, 1000);
}();
