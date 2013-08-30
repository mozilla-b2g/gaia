var clickHandlers = {
  'off': function () {
    window.navigator.vibrate(0);
  },
  'pattern1': function () {
    window.navigator.vibrate(200);
  },
  'pattern2': function () {
    window.navigator.vibrate([200,100,200]);
  },
  'longTime': function () {
    window.navigator.vibrate(100000);
  }
};

document.body.addEventListener('click', function (evt) {
  if (clickHandlers[evt.target.id])
    clickHandlers[evt.target.id].call(this, evt);
});
