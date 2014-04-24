'use strict';

// Whenever the check button is clicked,
// we delete previously displayed result (if any) then show new result
function checkSDCards() {
  var sdcards = navigator.getDeviceStorages('sdcard');
  document.getElementById('numOfCards').textContent = sdcards.length;

  // cardInfo collection
  var cardsInfo = document.getElementById('cardsInfo');

  // Clear last result
  while (cardsInfo.firstChild) {
    cardsInfo.removeChild(cardsInfo.firstChild);
  }

  // Show new result
  sdcards.forEach(function showCards(card, index, cards) {
    // To add a new SD cardInfo,
    // first copy one from card_template then modify it.
    var template = document.getElementById('card_template');
    var cardInfo = template.cloneNode(true);
    cardInfo.id = 'card' + index;
    cardInfo.classList.remove('invisible');

    var cardNo =
      cardInfo.querySelector('#card' + index + ' > .no > span');
    var cardStatus =
      cardInfo.querySelector('#card' + index + ' > .status > span');
    var cardSpace =
      cardInfo.querySelector('#card' + index + ' > .space');
    var cardSpaceTotal =
      cardInfo.querySelector('#card' + index + ' > .space > .totalSpace');
    var cardSpaceFree =
      cardInfo.querySelector('#card' + index + ' > .space > .freeSpace');
    var cardSpaceUsed =
      cardInfo.querySelector('#card' + index + ' > .space > .usedSpace');
    cardNo.textContent = index;

    // Show availability and hide other infomation if not available
    var reqAvailable = card.available();
    reqAvailable.onsuccess = function() {
      cardStatus.textContent = this.result;
      if (this.result == 'shared' || this.result == 'unavailable') {
        cardSpace.classList.add('invisible');
      }
    };
    reqAvailable.onerror = function() {
      cardStatus.textContent = 'Unable to get sdcard status' + this.error.name;
    };

    // Show space info.
    // If the other space info is already updated, show total space
    var reqFree = card.freeSpace();
    reqFree.onsuccess = function() {
      var spaceGB = this.result / Math.pow(10, 9);
      cardSpaceFree.textContent = spaceGB;
      if (cardSpaceTotal.textContent == '') {
        cardSpaceTotal.textContent = spaceGB;
      }
      else {
        cardSpaceTotal.textContent =
          parseFloat(cardSpaceTotal.textContent) + spaceGB;
      }
    };
    var reqUsed = card.usedSpace();
    reqUsed.onsuccess = function() {
      var spaceGB = this.result / Math.pow(10, 9);
      cardSpaceUsed.textContent = spaceGB;
      if (cardSpaceTotal.textContent == '') {
        cardSpaceTotal.textContent = spaceGB;
      }
      else {
        cardSpaceTotal.textContent =
          parseFloat(cardSpaceTotal.textContent) + spaceGB;
      }
    };

    cardsInfo.appendChild(cardInfo);
  });
}

window.addEventListener('load', function() {
  document.getElementById('check').addEventListener('click', checkSDCards);
});
