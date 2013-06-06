document.getElementById('button1').onclick = function fullscreen() {
  document.getElementById('fullscreen-div').mozRequestFullScreen();
}
document.getElementById('button2').onclick = function fullscreenFrame() {
  window.parent.document.getElementById('test-iframe').mozRequestFullScreen();
}

