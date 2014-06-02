/* global NullRingtone, Promise, ToneList, TonePlayer */
'use strict';

navigator.mozSetMessageHandler('activity', function(activity) {
  var tonePlayer = new TonePlayer();

  var toneTypes = activity.source.data.type;
  var allowNone = activity.source.data.allowNone;
  var currentToneID = activity.source.data.currentToneID;

  var allToneTypes = window.builtInRingtones.toneTypes;
  if (!Array.isArray(toneTypes)) {
    toneTypes = [toneTypes];
  }
  toneTypes = toneTypes.filter(function(x) {
    return allToneTypes.indexOf(x) !== -1;
  });

  // Put any unasked-for types in another array so we can list them at the end.
  var otherToneTypes = allToneTypes.filter(function(x) {
    return toneTypes.indexOf(x) === -1;
  });

  document.getElementById('cancel').addEventListener('click', function() {
    activity.postError('cancelled');
  });

  document.getElementById('done').addEventListener('click', function() {
    tonePlayer.isValid(function(valid) {
      if (!valid) {
        // The tone couldn't be played. Just act like the user canceled.
        activity.postError('cancelled');
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

  function PickerToneList(...args) {
    ToneList.apply(this, args);
  }
  PickerToneList.prototype = Object.create(ToneList.prototype);
  PickerToneList.prototype.constructor = PickerToneList;
  PickerToneList.prototype.makeItem = function(tone) {
    var item = ToneList.prototype.makeItem.call(this, tone);

    var input = item.querySelector('input');
    input.checked = (tone.id === currentToneID);
    input.addEventListener('click', function() {
      tonePlayer.setTone(tone);
      document.getElementById('done').disabled = false;
    });

    return item;
  };

  navigator.mozL10n.once(function() {
    var promises = [];
    var listParent = document.getElementById('list-parent');

    // Add the asked-for built-in tones.
    toneTypes.forEach(function(toneType, i) {
      var list = new PickerToneList('list-title-' + toneType, listParent);
      promises.push(window.builtInRingtones.list(toneType)
                          .then(function(tones) {
        list.add(tones);

        // Add the empty ringtone to the first list if it's allowed. This is a
        // bit strange, since the empty ringtone doesn't *really* belong in any
        // of our categories, so as a compromise, we just put it first. In
        // practice, this works out ok, since consumers generally set allowNone
        // to true when they want an alert tone, and the empty ringtone is
        // sort of an alert tone.
        if (i === 0 && allowNone) {
          list.add(new NullRingtone());
        }
      }));
    });

    var customList = new PickerToneList('list-title-custom', listParent);
    promises.push(window.customRingtones.list().then(function(tones) {
      customList.add(tones);
    }));

    // Add the unasked-for built-in tones.
    otherToneTypes.forEach(function(toneType, i) {
      var list = new PickerToneList('list-title-' + toneType, listParent);
      promises.push(window.builtInRingtones.list(toneType)
                          .then(function(tones) {
        list.add(tones);
      }));
    });

    Promise.all(promises).then(function(listsData) {
      // This just notifies the tests that we're finished building our lists.
      document.querySelector('body').dataset.ready = true;
    });
  });
});
