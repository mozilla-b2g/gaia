'use strict'
var clickHandlers = {
  'check': function () {
    var sdcards = navigator.getDeviceStorages('sdcard');
    document.getElementById('numOfCards').innerHTML = sdcards.length;

    // Clear previous result
    var cardsInfo = document.getElementById('cardsInfo');
    for(var i = 0; i < sdcards.length; i++)
    {
      var cardInfo = document.querySelector("#card"+i);
      if(cardInfo != undefined)
        cardsInfo.removeChild(card);
    }

    // Display SD cards info
    for(var i = 0; i < sdcards.length; i++)
    {
      var template = document.getElementById("card#");
      var cardInfo = template.cloneNode(true);
      cardInfo.id = "card"+i;
      cardInfo.classList.remove('invisible');
      cardsInfo.appendChild(cardInfo);

      var cardNo = document.querySelector("#card"+i+" > .no");
      cardNo.appendChild(document.createTextNode(i));

      var cardStatus = document.querySelector("#card"+i+" > .status");

      var reqAvailable = sdcards[i].available();
      reqAvailable.onsuccess = function () {
        if(this.result == "shared")
          cardStatus.appendChild(document.createTextNode("Shared. The info below may not be correct."));
        else       
          cardStatus.appendChild(document.createTextNode("available"));
      }
      reqAvailable.onerror = function () {
        cardStatus.appendChild(document.createTextNode("Unable to get the space used by the SDCard: " + this.error));
      }

      var cardTotal = document.querySelector("#card"+i+" > p > .totalSpace");
      var cardFree = document.querySelector("#card"+i+" > p >.freeSpace");
      var cardUsed = document.querySelector("#card"+i+" > p >.usedSpace");

      var reqFree = sdcards[i].freeSpace();
      reqFree.onsuccess = function () {
	var spaceGB = this.result / Math.pow(10,9);
        cardFree.innerHTML = spaceGB;
	if(cardTotal.innerHTML == "")
          cardTotal.innerHTML = spaceGB;
	else
          cardTotal.innerHTML = parseFloat(cardTotal.innerHTML) + spaceGB;
      }
      var reqUsed = sdcards[i].usedSpace();
      reqUsed.onsuccess = function () {
	var spaceGB = this.result / Math.pow(10,9);
        cardUsed.innerHTML = spaceGB;
	if(cardTotal.innerHTML == "")
          cardTotal.innerHTML = spaceGB;
	else
          cardTotal.innerHTML = parseFloat(cardTotal.innerHTML) + spaceGB;
      }
    }
  }
};

document.body.addEventListener('click', function (evt) {
  if (clickHandlers[evt.target.id])
    clickHandlers[evt.target.id].call(this, evt);
});
