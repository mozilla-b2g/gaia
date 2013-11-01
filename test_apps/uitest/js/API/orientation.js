function orientationTest(evt) {
  switch (evt.target.id) {
  case 'lock1':
    screen.mozLockOrientation(['portrait']);
    break;
  case 'lock2':
    screen.mozLockOrientation(['landscape']);
    break;
  case 'lock3':
    screen.mozLockOrientation(['portrait-primary']);
    break;
  case 'lock4':
    screen.mozLockOrientation(['portrait-secondary']);
    break;
  case 'lock5':
    screen.mozLockOrientation(['landscape-primary']);
    break;
  case 'lock6':
    screen.mozLockOrientation(['landscape-secondary']);
    break;
  case 'lock7':
    screen.mozLockOrientation(['portrait', 'landscape-primary']);
    break;
  case 'lock8':
    screen.mozLockOrientation(['portrait', 'landscape-secondary']);
    break;
  case 'lock9':
    screen.mozLockOrientation(['landscape', 'portrait-primary']);
    break;
  case 'lock10':
    screen.mozLockOrientation(['landscape', 'portrait-secondary']);
    break;
  case 'lock11':
    screen.mozLockOrientation(['portrait-primary', 'landscape-primary']);
    break;
  case 'lock12':
    screen.mozLockOrientation(['portrait-secondary', 'landscape-primary']);
    break;
  case 'lock13':
    screen.mozLockOrientation(['portrait-primary', 'landscape-secondary']);
    break;
  case 'lock14':
    screen.mozLockOrientation(['portrait-secondary', 'landscape-secondary']);
    break;
  case 'unlock':
    screen.mozUnlockOrientation();
    break;
  }
}

window.addEventListener('load', function() {
  var buttons = document.getElementsByTagName('button');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', orientationTest);
  }
});
