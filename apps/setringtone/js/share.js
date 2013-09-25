window.onload = function() {
  navigator.mozL10n.ready(function() {
    navigator.mozSetMessageHandler('activity', share);
  });
};

function share(activity) {
  var data = activity.source.data;
  var blob = data.blobs[0];

  var preview = document.getElementById('preview');
  var set = document.getElementById('set');
  var cancel = document.getElementById('cancel');
  var songtitle = document.getElementById('songtitle');
  var artist = document.getElementById('artist');
  var control = document.getElementById('playpause');

  preview.src = URL.createObjectURL(blob);
  if (data.metadata && data.metadata[0]) {
    songtitle.textContent = data.metadata[0].title || '';
    artist.textContent = data.metadata[0].artist || '';
  }

  preview.oncanplay = function() {
    set.disabled = false;
  };

  preview.onerror = function() {
    document.getElementById('message').textContent =
      navigator.mozL10n.get('cantplay');
  };

  cancel.onclick = function() {
    activity.postResult({});
  };

  set.onclick = function() {

    var name = '';
    if (data.metadata && data.metadata[0] && data.metadata[0].title)
      name = data.metadata[0].title;
    else if (data.filenames && data.filenames[0])
      name = data.filenames[0];

    var settings = {
      'dialer.ringtone': blob,
      'dialer.ringtone.name': name
    };

    navigator.mozSettings.createLock().set(settings).onsuccess = function() {
      activity.postResult({});
    };

    // Disable the button so the user can't click it twice
    set.disabled = true;

    // For a large blob this can take a while, so display a message
    document.getElementById('title').textContent =
      navigator.mozL10n.get('settingringtone');
  };

  control.onclick = function() {
    if (preview.paused)
      preview.play();
    else
      preview.pause();
  };

  preview.onplaying = function() {
    control.classList.add('playing');
  };

  preview.onpause = function() {
    control.classList.remove('playing');
  };
}
