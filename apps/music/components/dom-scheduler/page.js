(function() {
  var debug = false;
  var headerHeight = 50;
  var maxItemCount = 28;

  var endEvent = ('ontouchstart' in window) ? 'touchend' : 'mouseup';

  window.addEventListener('load', function() {
    var listContainer = document.querySelector('section');

    var source = new BaconSource();
    var list = new FastList(listContainer, source);

    function updateHeader() {
      return scheduler.mutation(function() {
        var h1 = document.querySelector('h1');
        h1.textContent = 'Main List (' + source.fullLength() + ')';
        h1.scrollTop; // flush
      });
    }
    updateHeader();

    function openAlert(evt) {
      scheduler.mutation(function() {
        var detail = evt.detail;
        var li = source.getRecordAt(detail.index);
        alert(li.title + ' item clicked!');
      });
    }
    list.list.addEventListener('item-selected', openAlert);

    function clearNewIndicator() {
      var h1After = document.querySelector('#h1-after');

      if (h1After.dataset.anim == 'reveal') {
        scheduler.transition(function() {
          h1After.dataset.anim = 'hide';
        }, h1After, 'animationend');
      }
    }
    listContainer.addEventListener('top-reached', clearNewIndicator);

    function updateNewIndicator() {
      var h1After = document.querySelector('#h1-after');
      if (h1After.dataset.anim == 'reveal') {
        return;
      }

      scheduler.transition(function() {
        h1After.dataset.anim = 'reveal';
      }, h1After, 'animationend');
    }
    listContainer.addEventListener('hidden-new-content', updateNewIndicator);

    function newContentHandler() {
      var newContent = {
        title: 'NEW Bacon ' + Date.now().toString().slice(7, -1),
        body: 'Turkey BLT please.'
      };

      source.insertAtIndex(0, newContent);
      list.insertedAtIndex(0);

      updateHeader();
    }

    setInterval(newContentHandler, 15000);
    window.addEventListener('new-content', newContentHandler);

    window.pushNewContent = function() {
      window.dispatchEvent(new CustomEvent('new-content'));
    };

    var button = document.querySelector('button');
    button.addEventListener(endEvent, function() {
      Promise.all([toggleTransitioning(), list.toggleEditMode()])
        .then(updateText)
        .then(toggleTransitioning);
    });

    function updateText(text) {
      return scheduler.mutation(function() {
        button.textContent = list.editing ? 'Exit' : 'Edit';
      });
    }

    function toggleTransitioning() {
      return scheduler.feedback(function() {
        button.classList.toggle('transitioning');
      }, button, 'transitionend');
    }
  });
})();
