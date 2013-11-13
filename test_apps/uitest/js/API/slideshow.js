function slideshow() {
  var a = new MozActivity({ name: 'slideshow'});
  a.onsuccess = function(e) {
  };
  a.onerror = function() { alert('Failure slide show'); };
}

document.getElementById('s1').onclick = function() { slideshow(); };
