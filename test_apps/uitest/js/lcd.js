function turnOn() {
    navigator.mozPower.screenEnabled = true;
    alert(navigator.mozPower.screenEnabled);
}

var fullscreenDiv = document.getElementById('fullscreen-div');
fullscreenDiv.onclick = function () {
    document.mozCancelFullScreen();
    fullscreenDiv.classList.remove('red');
    fullscreenDiv.classList.remove('green');
    fullscreenDiv.classList.remove('blue');
    fullscreenDiv.classList.remove('white');
    fullscreenDiv.classList.remove('black');
    fullscreenDiv.classList.add('invisible');
}

var clickHandlers = {
  'red': function () {
    fullscreenDiv.mozRequestFullScreen();
    fullscreenDiv.classList.remove('invisible');
    fullscreenDiv.classList.add('red');
  },
  'green': function () {
    fullscreenDiv.mozRequestFullScreen();
    fullscreenDiv.classList.remove('invisible');
    fullscreenDiv.classList.add('green');
  },
  'blue': function () {
    fullscreenDiv.mozRequestFullScreen();
    fullscreenDiv.classList.remove('invisible');
    fullscreenDiv.classList.add('blue');
  },
  'white': function () {
    fullscreenDiv.mozRequestFullScreen();
    fullscreenDiv.classList.remove('invisible');
    fullscreenDiv.classList.add('white');
  },
  'black': function () {
    fullscreenDiv.mozRequestFullScreen();
    fullscreenDiv.classList.remove('invisible');
    fullscreenDiv.classList.add('black');
  },
  'off': function () {
    setTimeout(turnOn, 3000);
    navigator.mozPower.screenEnabled = false;
  }
};

document.body.addEventListener('click', function (evt) {
  if (clickHandlers[evt.target.id])
    clickHandlers[evt.target.id].call(this, evt);
});
