// When we get an onload event for this main document we set the src
// property of the iframe to start loading the game.  Then we also
// set some CSS styles that will begin CSS transitions that will
// fill the blackscreen time while the game loads

window.onload = function() {
  var gameframe = document.getElementById("gameframe");
  var splash = document.getElementById("splash");

  // Start a CSS animation
  splash.style.top = "340px";
  splash.addEventListener("transitionend", function(e) {
    if (e.propertyName === "top") {
      splash.style.MozTransform = "rotate(360deg)";
    }
    else if (e.propertyName === "-moz-transform") {
      if (splash.style.opacity !== "0") {
        splash.style.MozTransform = "scale(4)";
        splash.style.opacity = 0;
      }
      else {
        splash.parentNode.removeChild(splash);
      }
    }
  });

  // Load the game.
  gameframe.src = 'http://goosypets.com/html5games/tower/';

  gameframe.onload = function() { 
    // Make it opaque when loaded, hiding the splash icon
    gameframe.style.opacity = 1;
  };

};

