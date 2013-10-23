// If we open this page from an activity, bind the back button to it
navigator.mozSetMessageHandler('activity', function(a) {
  document.querySelector('#go-back').addEventListener('click', function() {
    a.postResult(true);
  });
});
