var open = document.getElementById('open');
var opensave = document.getElementById('opensave');
open.hidden = true;
opensave.hidden = true;

open.onclick = function() {
  var a = new MozActivity({
    name: 'open',
    data: {
      type: 'video/3gpp',
      blob: videoblob,
      title: 'Stapler'
    }
  });
  a.onsuccess = function() {
    console.log('activity returns', JSON.stringify(a.result));
  };
};

opensave.onclick = function() {
  var a = new MozActivity({
    name: 'open',
    data: {
      type: 'video/3gpp',
      blob: videoblob,
      allowSave: true,
      filename: 'downloads/uitest/stapler.3gp'
    }
  });
  a.onsuccess = function() {
    console.log('activity returns', JSON.stringify(a.result));
  };
};

// The image we want to view
var videoblob;

var xhr = new XMLHttpRequest();
xhr.open('GET', '../../data/video/stapler.3gp');
xhr.responseType = 'blob';
xhr.send();
xhr.onload = function() {
  videoblob = new Blob([xhr.response], { type: 'video/3gpp' });
  open.hidden = false;
  opensave.hidden = false;
};
xhr.onerror = function() {
  console.log('Error loading test video', xhr.error.name);
};
