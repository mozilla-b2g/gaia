// When we get an onload event for this main document we set the src
// property of the iframe to start loading the game. And we also
// start a CSS animation to fill the blackscreen time while the game loads.
window.addEventListener('load', function() {
  var gameframe = document.getElementById('gameframe');
  var splash = document.getElementById('splash');

  // Load the game.
  gameframe.src = 'http://goosypets.com/html5games/tower/';

  gameframe.onload = function() {
    // Make it opaque when loaded, hiding the splash icon
    gameframe.style.opacity = 1;
    splash.style.opacity = 0;
    splash.addEventListener('transitionend', function() {
      // When the transition is done, remove the splash image completely
      splash.parentNode.removeChild(splash);
    });
  };
});
