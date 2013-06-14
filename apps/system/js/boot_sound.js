var BootSound = (function() {

  function playBootupSound(delay) {
    var bootupSound = new Audio('./resources/sounds/bootup.ogg');
    if (delay === 0) {
      bootupSound.play();
    } else {
      setTimeout(function timeoutPlay() {
        bootupSound.play();
      }, delay || 500);
    }
  }

  window.addEventListener('ftudone', function ftuDone() {
    playBootupSound();
  });

  window.addEventListener('ftuskip', function skipFTU() {
    playBootupSound(1550);
  });

})();
