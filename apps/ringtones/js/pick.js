/* global NullRingtone, Promise, ToneList, TonePlayer */
'use strict';

(function() {
  var tonePlayer = new TonePlayer();
  var header = document.getElementById('header');
  var setButton = document.getElementById('set');
  var allTones = {};

  header.addEventListener('action', function() {
    tonePlayer.stop();
  });

  setButton.addEventListener('click', function() {
    tonePlayer.stop();
  });

  function PickerToneList(...args) {
    ToneList.apply(this, args);
  }
  PickerToneList.prototype = Object.create(ToneList.prototype);
  PickerToneList.prototype.constructor = PickerToneList;
  PickerToneList.prototype.makeItem = function(tone) {
    var item = ToneList.prototype.makeItem.call(this, tone);
    allTones[tone.id] = item;

    var input = item.querySelector('gaia-radio');
    input.addEventListener('click', function() {
      tonePlayer.setTone(tone);
      setButton.disabled = false;
    });

    return item;
  };

  navigator.mozL10n.once(function() {
    var listParent = document.getElementById('list-parent');
    var toneLists = {};
    var promises = [];

    var noneList = new PickerToneList('section-title-none', listParent);
    noneList.add(new NullRingtone());

    window.builtInRingtones.toneTypes.forEach(function(toneType) {
      var builtInList = new PickerToneList(
        'section-title-builtin-' + toneType, listParent
      );
      promises.push(window.builtInRingtones.list(toneType).then(
        (tones) => builtInList.add(tones)
      ));

      var customList = new PickerToneList(
        'section-title-custom-' + toneType, listParent
      );
      promises.push(window.customRingtones.list(toneType).then(
        (tones) => customList.add(tones)
      ));
      promises.push(window.sdCardRingtones.list(toneType).then(
        (tones) => customList.add(tones)
      ));

      toneLists[toneType] = {builtIn: builtInList, custom: customList};
    });

    Promise.all(promises).then(function() {
      // This just notifies the tests that we're finished building our lists.
      document.querySelector('body').dataset.ready = true;
    });

    navigator.mozSetMessageHandler('activity', function(activity) {

      var requestedTypes = activity.source.data.type;
      if (!Array.isArray(requestedTypes)) {
        requestedTypes = [requestedTypes];
      }

      // Put the requested tone types first, followed by all the rest.
      var allToneTypes = window.builtInRingtones.toneTypes;
      var toneTypes = [
        ...requestedTypes.filter((x) => allToneTypes.includes(x)),
        ...allToneTypes.filter((x) => !requestedTypes.includes(x))
      ];

      // Rearrange the lists so they're in the expected order.
      toneTypes.forEach((toneType) => {
        listParent.appendChild(toneLists[toneType].builtIn.element);
        listParent.appendChild(toneLists[toneType].custom.element);
      });

      // Show/hide the "None" ringtone.
      noneList.element.hidden = !activity.source.data.allowNone;

      // Find the item corresponding to the current ringtone, and select it.
      Promise.all(promises).then(() => {
        var currentItem = allTones[activity.source.data.currentToneID];
        if (currentItem) {
          currentItem.querySelector('gaia-radio').checked = true;
        }
      });

      header.addEventListener('action', function() {
        activity.postError('cancelled');
      });

      setButton.addEventListener('click', function() {
        tonePlayer.isValid(function(valid) {
          if (!valid) {
            // The tone couldn't be played. Just act like the user canceled.
            activity.postError('cancelled');
            return;
          }

          var selectedTone = tonePlayer.currentTone;
          selectedTone.getBlob().then(function(blob) {
            activity.postResult({
              name: selectedTone.name,
              l10nID: selectedTone.l10nID,
              id: selectedTone.id,
              blob: blob
            });
          });
        });
      });

    });

  });
})();
