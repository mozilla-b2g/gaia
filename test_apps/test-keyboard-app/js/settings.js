navigator.mozSetMessageHandler('activity', function(a) {
  document.querySelector('#go-back').addEventListener('click', function() {
    a.postResult(true);
  });
});
