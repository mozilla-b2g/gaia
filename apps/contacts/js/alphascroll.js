
'use strict';

var contacts = window.contacts || {};

if (!contacts.AlphaScroll) {

  (function(doc) {

    var alphaScrollBar = doc.querySelector('.vw-jumper');
    var lContacts = doc.querySelector('.vw-bdy-inner');
    var tap = 'mousedown', move = 'mousemove';
    var letterElemType = 'ABBR', prefixGroup = '#group-';

    var currentLetterAbbr = doc.querySelector('.vw-jmp-current > abbr');
    var currentLetterClassList = doc.querySelector('.vw-jmp-current').classList;

    var alphabet = [];
    for (var i = 65; i <= 90; i++) {
      alphabet.push({letter: String.fromCharCode(i)});
    }
    utils.templates.append(doc.querySelector('.vw-jmp-inner'), alphabet);
    alphabet = [];

    var cas = contacts.AlphaScroll = {
      state: {
        letter: undefined,
        timeout: undefined
      },

      start: function th_start() {
        alphaScrollBar.addEventListener(tap, this);
        alphaScrollBar.addEventListener(move, this);
      },

      onMove: function th_touchStart(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var state = this.state;

        var currentLetter = evt.target.textContent;

        if (evt.target.nodeName === letterElemType &&
            currentLetter && currentLetter !== state.letter) {
          state.letter = currentLetter;
          var groupContainer = doc.querySelector(prefixGroup + currentLetter);
          if (groupContainer && groupContainer.clientHeight > 0) {
            currentLetterAbbr.textContent = currentLetter;
            currentLetterClassList.remove('hide');
            clearTimeout(state.timeout);
            lContacts.scrollTop = groupContainer.offsetTop;
            state.timeout = setTimeout(function() {
              currentLetterClassList.add('hide');
            }, 3000);
          }
        }
      },

      handleEvent: function th_handleEvent(evt) {
        var type = evt.type;
        if (type === tap || type === move) {
          this.onMove(evt);
        }
      }
    };

    cas.start();

  })(document);
}
