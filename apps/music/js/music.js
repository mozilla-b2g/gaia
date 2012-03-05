var songs = [
  {
    file: 'audio/jonobacon-freesoftwaresong2.ogg',
    title: 'The Free Software Song',
    artist: 'Jono Bacon'
  },
  {
    file: 'audio/b2g.ogg',
    title: 'Boot to Gecko',
    artist: 'Brendan Eich'
  },
  {
    file: 'audio/Salt_Creek.ogg',
    title: 'Salt Creek',
    artist: 'The Rogue Bluegrass Band'
  },
  {
    file: 'audio/treasure_island_01-02_stevenson.ogg',
    title: 'Treasure Island',
    artist: 'Read by Adrian Praetzellis'
  }
];

window.addEventListener('DOMContentLoaded', function() {
  var songList = document.getElementById('songs');
  var player = document.getElementById('player');
  var audio = document.getElementById('playerAudio');

  var content = '';
  songs.forEach(function(song) {
    content += '<li class="song">' +
      '  <a id="' + song.file + '" href="#">' +
      '    ' + song.title + ' - ' + song.artist +
      '  </a>' +
      '</li>';
  });
  songList.innerHTML = content;

  songList.addEventListener('click', function(evt) {
    var target = evt.target;
    if (!target)
      return;
    playSong(target.id); // song url is anchor id
  });
  
  window.addEventListener('keyup', function keyPressHandler(evt) {
    if (playing && evt.keyCode == evt.DOM_VK_ESCAPE) {
      stopSong();
      showSongList();
      evt.preventDefault();
    }
  });

  var playing = false;
  
  function showSongList(songs) {
    songList.classList.remove('hidden');
    player.classList.add('hidden');
    playing = false;
  }

  function playSong(url) {
    songList.classList.add('hidden');
    player.classList.remove('hidden');
    audio.src = url;
    playing = true;
  }

  function stopSong(song) {
    audio.pause();
    playing = false;
  }
});
