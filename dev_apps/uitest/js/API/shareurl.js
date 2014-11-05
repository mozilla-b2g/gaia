var share = document.querySelector('#share');
if (share) {
  share.onclick = function() {
    var sharing = new MozActivity({
      name: 'share',
      data: {
        type: 'url', // Possibly text/html in future versions,
        number: 1,
        url: 'http://www.mozilla.org'
      }
    });
  };
}
