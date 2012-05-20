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

var MODE_TILES = 1;
var MODE_LIST = 2;
var MODE_PLAYER = 3;

window.addEventListener('DOMContentLoaded', function() {
  var body = document.body;
  var songList = document.getElementById('views-list');
  var player = document.getElementById('player');
  var audio = document.getElementById('player-audio');
  
  var titleText = document.getElementById('title-text');
  
  var playerCoverTitle = document.getElementById('player-cover-title');
  var playerCoverArtist = document.getElementById('player-cover-artist');
  var playerControlsPrevious = document.getElementById('player-controls-previous');
  var playerControlsPlay = document.getElementById('player-controls-play');
  var playerControlsNext = document.getElementById('player-controls-next');
  
  changeMode(MODE_LIST);
  
  var content = '';
  songs.forEach(function(song) {
    content += '<li class="song">' +
      '  <a id="' + song.file + '" ' + 'data-title="'+ song.title + '" ' + 'data-artist="'+ song.artist + '" ' + 'href="#">' +
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
    playerCoverTitle.innerHTML = target.dataset.title;
    playerCoverArtist.innerHTML = target.dataset.artist;
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
    changeMode(MODE_LIST);
    
    playing = false;
  }

  function playSong(url) {
    changeMode(MODE_PLAYER);
    
    audio.src = url;
    playing = true;
  }

  function stopSong(song) {
    audio.pause();
    playing = false;
  }
  
  function changeMode(mode) {
    body.classList.remove('tiles-mode');
    body.classList.remove('list-mode');
    body.classList.remove('player-mode');
    
    switch (mode) {
      case MODE_TILES:
        body.classList.add('tiles-mode');
        break;
      case MODE_LIST:
        body.classList.add('list-mode');
        break;
      case MODE_PLAYER:
        body.classList.add('player-mode');
        break;
    }
  }
});
