document.getElementById('lock1').onclick = function() {
  screen.mozLockOrientation('portrait');
};
document.getElementById('lock2').onclick = function() {
  screen.mozLockOrientation('landscape');
};
document.getElementById('lock3').onclick = function() {
  screen.mozLockOrientation('portrait-primary');
};
document.getElementById('lock4').onclick = function() {
  screen.mozLockOrientation('portrait-secondary');
};
document.getElementById('lock5').onclick = function() {
  screen.mozLockOrientation('landscape-primary');
};
document.getElementById('lock6').onclick = function() {
  screen.mozLockOrientation('landscape-secondary');
};
document.getElementById('lock7').onclick = function() {
  screen.mozLockOrientation('portrait', 'landscape-primary');
};
document.getElementById('lock8').onclick = function() {
  screen.mozLockOrientation('portrait', 'landscape-secondary');
};
document.getElementById('lock9').onclick = function() {
  screen.mozLockOrientation('landscape', 'portrait-primary');
};
document.getElementById('lock10').onclick = function() {
  screen.mozLockOrientation('landscape', 'portrait-secondary');
};
document.getElementById('lock11').onclick = function() {
  screen.mozLockOrientation('portrait-primary', 'landscape-primary');
};
document.getElementById('lock12').onclick = function() {
  screen.mozLockOrientation('portrait-secondary', 'landscape-primary');
};
document.getElementById('lock13').onclick = function() {
  screen.mozLockOrientation('portrait-primary', 'landscape-secondary');
};
document.getElementById('lock14').onclick = function() {
  screen.mozLockOrientation('portrait-secondary', 'landscape-secondary');
};

document.getElementById('unlock').onclick = function() {
  screen.mozUnlockOrientation();
};
