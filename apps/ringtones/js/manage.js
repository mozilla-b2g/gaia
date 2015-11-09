/* global ActionsMenu, isToneInUse, MozActivity, Promise, setTone,
   Toaster, ToneList, TonePlayer */
/* jshint unused:false */
'use strict';

(function() {
  var tonePlayer = new TonePlayer();
  var header = document.getElementById('header');

  header.addEventListener('action', function() {
    tonePlayer.stop();
  });

  function addNewTone(customRingtonesList) {
    tonePlayer.stop();

    var pickActivity = new MozActivity({
      name: 'pick',
      data: {
        type: 'audio/*'
      }
    });

    pickActivity.onsuccess = function() {
      var result = pickActivity.result;
      var popup = window.open('share.html', 'share', 'mozhaidasheet');
      popup.addEventListener('load', function loaded() {
        popup.removeEventListener('load', loaded);
        popup.postMessage(result, window.location.origin);
      });

      window.addEventListener('message', function receive(event) {
        window.removeEventListener('message', receive);
        if (event.origin !== window.location.origin) {
          console.error('Couldn\'t recieve message: origins don\'t match',
                        event.origin, window.location.origin);
          return;
        }

        var data = event.data;
        if (data.command !== 'save') {
          return;
        }

        // XXX: The child window just sends the DB key for the new ringtone and
        // we have to grab it from our instance of the DB. It'd be nice if we
        // could just listen for changes to the DB and update automatically...
        window.customRingtones.get(data.details.toneID).then(function(tone) {
          customRingtonesList.add(tone);
        });
      });
    };
  }

  function ManagerToneList(...args) {
    ToneList.apply(this, args);
    this._actionsMenu = new ActionsMenu(
      document.getElementById('ringtone-actions')
    );
  }
  ManagerToneList.prototype = Object.create(ToneList.prototype);
  ManagerToneList.prototype.constructor = ManagerToneList;
  ManagerToneList.prototype.makeItem = function(tone) {
    var item = ToneList.prototype.makeItem.call(this, tone);

    item.querySelector('.desc').addEventListener('click', function() {
      tonePlayer.setTone(tone, function(playing) {
        item.dataset.playing = playing;
      });
    });

    var self = this;
    var actionsButton = item.querySelector('.actions-button');
    actionsButton.addEventListener('click', function() {
      tonePlayer.stop();
      window.systemTones.isInUse(tone).then(function(inUseAs) {
        self._actionsMenu.open(tone, inUseAs, function(command) {
          if (command === 'delete') {
            self.remove(tone);

            // If this is the current default ringtone (or alert tone), reset
            // the default tone.
            inUseAs.forEach(function(toneType) {
              window.systemTones.getDefault(toneType).then(function(tone) {
                window.systemTones.set(toneType, tone);
              });
            });
          }
        });
      });
    });

    return item;
  };

  navigator.mozL10n.once(function() {
    var listParent = document.getElementById('list-parent');
    var toneLists = {};
    var promises = [];

    window.builtInRingtones.toneTypes.forEach(function(toneType) {
      var builtInList = new ManagerToneList(
        'section-title-builtin-' + toneType, listParent
      );
      promises.push(window.builtInRingtones.list(toneType).then(
        (tones) => builtInList.add(tones)
      ));

      var customList = new ManagerToneList(
        'section-title-custom-' + toneType, listParent
      );
      promises.push(window.customRingtones.list(toneType).then(
        (tones) => customList.add(tones)
      }));
      promises.push(window.sdCardRingtones.list(toneType).then(
        (tones) => customList.add(tones)
      }));

      toneLists[toneType] = {builtIn: builtInList, custom: customList};
    });

    // Since we've built our custom ringtones list, we can now let the user
    // add new tones to it!
    document.getElementById('add').addEventListener(
      'click', () => addNewTone(toneLists.ringtone.custom)
    );

    Promise.all(promises).then(function() {
      // This just notifies the tests that we're finished building our lists.
      document.querySelector('body').dataset.ready = true;
    });
  });

  navigator.mozSetMessageHandler('activity', function(activity) {
    // Conclude the activity if the user taps "back".
    header.addEventListener('action', function() {
      activity.postResult({});
    });
  });

})();
