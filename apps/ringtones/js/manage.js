/* global ActionsMenu, isToneInUse, MozActivity, Promise, setTone,
   Toaster, ToneList, TonePlayer */
/* jshint unused:false */
'use strict';

navigator.mozSetMessageHandler('activity', function(activity) {
  var tonePlayer = new TonePlayer();

  // Until Haida lands this is how users could go back to Settings app.
  document.getElementById('back').addEventListener('click', function() {
    activity.postResult({});
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

  var actionsMenu = new ActionsMenu(
    document.getElementById('ringtone-actions')
  );

  function ManagerToneList(...args) {
    ToneList.apply(this, args);
  }
  ManagerToneList.prototype = Object.create(ToneList.prototype);
  ManagerToneList.prototype.constructor = ManagerToneList;
  ManagerToneList.prototype.makeItem = function(tone) {
    var item = ToneList.prototype.makeItem.call(this, tone);

    item.querySelector('.desc').addEventListener('click', function() {
      tonePlayer.setTone(tone);
    });

    var self = this;
    var actionsButton = item.querySelector('.actions-button');
    actionsButton.addEventListener('click', function() {
      tonePlayer.stop();
      window.systemTones.isInUse(tone).then(function(inUseAs) {
        actionsMenu.open(tone, inUseAs, function(command) {
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
    var promises = [];
    var listParent = document.getElementById('list-parent');

    // Add the built-in ringtones.
    var builtInList = new ManagerToneList('list-title-ringtone', listParent);
    promises.push(window.builtInRingtones.list('ringtone')
                        .then(function(tones) {
      builtInList.add(tones);
    }));

    // Add the custom ringtones.
    var customList = new ManagerToneList('list-title-custom', listParent);
    promises.push(window.customRingtones.list().then(function(tones) {
      customList.add(tones);

      // Since we've built our custom tones list, we can now let the user add
      // new tones to it!
      document.getElementById('add').addEventListener(
        'click', addNewTone.bind(null, customList)
      );
    }));

    Promise.all(promises).then(function() {
      // This just notifies the tests that we're finished building our lists.
      document.querySelector('body').dataset.ready = true;
    });
  });
});
