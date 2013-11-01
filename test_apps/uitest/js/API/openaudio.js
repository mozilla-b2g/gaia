var open = document.getElementById('open');
var opensavefile = document.getElementById('opensavefile');
var opensaveblob = document.getElementById('opensaveblob');
open.hidden = true;
opensavefile.hidden = true;
opensaveblob.hidden = true;

open.onclick = function() {
  var a = new MozActivity({
    name: 'open',
    data: {
      type: 'audio/ogg',
      blob: localblob,
      title: 'jonobacon-freesoftwaresong2.ogg'
    }
  });
  a.onsuccess = function() {
    console.log('activity returns', JSON.stringify(a.result));
  };
};

opensavefile.onclick = function() {
  var a = new MozActivity({
    name: 'open',
    data: {
      type: 'audio/ogg',
      blob: localblob,
      allowSave: true,
      filename: 'downloads/uitest/jonobacon-freesoftwaresong2.ogg'
    }
  });
  a.onsuccess = function() {
    console.log('activity returns', JSON.stringify(a.result));
  };
};

opensaveblob.onclick = function() {
  var a = new MozActivity({
    name: 'open',
    data: {
      type: 'audio/ogg',
      blob: remoteblob,
      allowSave: true,
      filename: 'downloads/uitest/Back_In_Black-sample.ogg'
    }
  });
  a.onsuccess = function() {
    console.log('activity returns', JSON.stringify(a.result));
  };
};

// The audio we want to open
var localblob;
var remoteblob;
var localURL = '../../data/audio/jonobacon-freesoftwaresong2.ogg';
var remoteURL = 'http://upload.wikimedia.org/wikipedia/en/4/45/' +
                'ACDC_-_Back_In_Black-sample.ogg';

var localxhr = new XMLHttpRequest();
localxhr.open('GET', localURL);
localxhr.responseType = 'blob';
localxhr.send();
localxhr.onload = function() {
  localblob = new Blob([localxhr.response], { type: 'audio/ogg' });
  open.hidden = false;
  opensavefile.hidden = false;
};
localxhr.onerror = function() {
  console.log('Error loading test audio', localxhr.error.name);
};

var remotexhr = new XMLHttpRequest();
remotexhr.open('GET', remoteURL);
remotexhr.responseType = 'blob';
remotexhr.send();
remotexhr.onload = function() {
  remoteblob = new Blob([remotexhr.response], { type: 'audio/ogg' });
  opensaveblob.hidden = false;
};
remotexhr.onerror = function() {
  console.log('Error loading test audio from network', remotexhr.error.name);
};
