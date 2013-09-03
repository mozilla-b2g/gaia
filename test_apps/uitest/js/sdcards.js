'use strict'
var clickHandlers = {
  'check': function () {
    var sdcards = navigator.getDeviceStorages('sdcard');
    document.getElementById('numOfCards').innerHTML = sdcards.length;

    // Clear previous result
    var cardsDisplay = document.getElementById('cardsInfo');

    // Display SD cards info
    for(var i = 0; i < sdcards.length; i++)
    {
      var cardDisplay = document.createElement("P");
      cardsDisplay.appendChild(cardDisplay);

      var cardNo = document.createElement("P");
      cardNo.appendChild(document.createTextNode("SD card #"+ i));
      cardDisplay.appendChild(cardNo);

      var cardStatus = document.createElement("P");
      cardStatus.appendChild(document.createTextNode("status: "));
      cardDisplay.appendChild(cardStatus);

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

      var PTotal = document.createElement("P");
      var PFree = document.createElement("P");
      var PUsed = document.createElement("P");
      PTotal.appendChild(document.createElement("SPAN"));
      PFree.appendChild(document.createElement("SPAN"));
      PUsed.appendChild(document.createElement("SPAN"));

      PTotal.insertBefore(document.createTextNode("Total space: "),PTotal.firstChild);
      PFree.insertBefore(document.createTextNode("Free space: "),PFree.firstChild);
      PUsed.insertBefore(document.createTextNode("Used space: "),PUsed.firstChild);
      PTotal.appendChild(document.createTextNode(" GB"));
      PFree.appendChild(document.createTextNode(" GB"));
      PUsed.appendChild(document.createTextNode(" GB"));

      cardDisplay.appendChild(PTotal);
      cardDisplay.appendChild(PFree);
      cardDisplay.appendChild(PUsed);

      var reqFree = sdcards[i].freeSpace();
      reqFree.onsuccess = function () {
	var spaceGB = this.result / Math.pow(10,9);
        PFree.childNodes[1].innerHTML = spaceGB;
	if(PTotal.childNodes[1].innerHTML == "")
          PTotal.childNodes[1].innerHTML = spaceGB;
	else
          PTotal.childNodes[1].innerHTML = parseFloat(PTotal.childNodes[1].innerHTML) + spaceGB;
      }
      var reqUsed = sdcards[i].usedSpace();
      reqUsed.onsuccess = function () {
	var spaceGB = this.result / Math.pow(10,9);
        PUsed.childNodes[1].innerHTML = spaceGB;
	if(PTotal.childNodes[1].innerHTML == "")
          PTotal.childNodes[1].innerHTML = spaceGB;
	else
          PTotal.childNodes[1].innerHTML = parseFloat(PTotal.childNodes[1].innerHTML) + spaceGB;
      }
    }
  }
};

document.body.addEventListener('click', function (evt) {
  if (clickHandlers[evt.target.id])
    clickHandlers[evt.target.id].call(this, evt);
});
