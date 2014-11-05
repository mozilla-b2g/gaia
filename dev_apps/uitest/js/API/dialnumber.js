var dial = document.querySelector('#dial');
if (dial) {
    dial.onclick = function() {
      var call = new MozActivity({
        name: 'dial',
        data: {
          number: '+46777888999'
        }
      });
    };
}
