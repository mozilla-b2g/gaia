'use strict';
/* global utils */
/* global MessageBroadcaster */
/* exported ContactsTag */

var ContactsTag = (function() {
  var originalTag = null;
  var selectedTag = null;
  var customTag = null;
  var messageBroadcaster = null;

  var setCustomTag = function setCustomTag(element) {
    customTag = element;
  };

  var setCustomTagVisibility = function setCustomTagVisibility(value) {
    if (!customTag) {
      return;
    }

    if (value) {
      customTag.classList.remove('hide');
    }
    else {
      customTag.classList.add('hide');
    }
  };

  var touchCustomTag = function touchCustomTag(callback) {
    if (selectedTag) {
      selectedTag.removeAttribute('class');
    }
    selectedTag = null;

    if (callback !== undefined && typeof callback === 'function') {
      callback();
    }
  };

  var fillTagOptions = function fillTagOptions(target, _originalTag, options) {
    utils.dom.removeChildNodes(target);
    originalTag = _originalTag;

    var selectedLink;
    /* jshint loopfunc:true */
    for (var option in options) {
      var tagLink = document.createElement('button');
      tagLink.dataset.index = option;
      tagLink.textContent = options[option].value;
      tagLink.setAttribute('data-l10n-id', options[option].type);
      tagLink.setAttribute('data-value', options[option].type);
      tagLink.setAttribute('role', 'option');

      tagLink.addEventListener('click', function(event) {
        var tag = event.target;
        selectTag(tag);
        event.preventDefault();
      });

      if (originalTag.dataset.value == options[option].type) {
        selectedLink = tagLink;
      }

      var tagItem = document.createElement('li');
      tagItem.setAttribute('role', 'presentation');
      tagItem.appendChild(tagLink);
      target.appendChild(tagItem);
    }

    customTag.value = '';
    if (!selectedLink && originalTag.textContent) {
      customTag.value = originalTag.textContent;
    }
    selectTag(selectedLink);
  };

  var selectTag = function selectTag(tag) {
    if (tag == null) {
      return;
    }

    //Clean any trace of the custom tag
    customTag.value = '';

    if (selectedTag) {
      selectedTag.removeAttribute('class');
      selectedTag.removeAttribute('aria-selected');
    }
    tag.className = 'icon icon-selected';
    tag.setAttribute('aria-selected', true);
    selectedTag = tag;
  };

  var clickDone = function clickDone(callback) {
    var tagData = {
      dataset: {}
    };

    tagData.prevValue = originalTag.textContent;

    if (selectedTag) {
      tagData.textContent = selectedTag.textContent;
      tagData.dataset.l10nId = selectedTag.dataset.l10nId;
      tagData.dataset.value = selectedTag.dataset.value;
    } else if (customTag.value.length > 0) {
      tagData.textContent = customTag.value;
      tagData.dataset.value = customTag.value;
    }

    if (messageBroadcaster === null) {
      messageBroadcaster = new MessageBroadcaster();
    }

    messageBroadcaster.fire('value-modified', tagData);

    if (callback !== undefined && typeof callback === 'function') {
      callback();
    }
  };

  // Filter tags to be shown when selecting an item type (work, birthday, etc)
  // This is particularly useful for dates as we cannot have multiple instances
  // of them (only one birthday, only one anniversary)
  function filterTags(type, currentNode, tags) {
    if (!currentNode || !currentNode.exclusive) {
      return tags;
    }

    // If the type is exclusive the tag options are filtered according to
    // the existing ones
    var newOptions = tags.slice(0);

    newOptions = newOptions.filter(function(ele) {
      return currentNode.sameTypeTags.indexOf(ele.type) === -1;
    });


    return newOptions;
  }

  var prepareTagData = function(type, node) {
    var element = document.querySelector(
      '[data-template]' + '.' + type + '-template'
    );

    var exclusive = false;
    var customTagVisible = false;

    if (element) {
      exclusive = element.dataset.exclusive || false;
      customTagVisible = (element.dataset.custom != 'false');
    }

    var sameTypeTags = [];
    if (exclusive) {
      var sameType = document.querySelectorAll('.' + type + '-template');
      if (sameType.length > 1) {
        /* jshint loopfunc:true */
        for (var j = 0; j < sameType.length; j++) {
          var itemSame = sameType.item(j);
          var tagNode = itemSame.querySelector('[data-field="type"]');
          if (tagNode !== node &&
              !itemSame.classList.contains('removed')) {
            sameTypeTags.push(tagNode.dataset.value);
          }
        }
      }
    }

    return {
      type: type,
      customTagVisible: customTagVisible,
      exclusive: exclusive,
      sameTypeTags: sameTypeTags
    };
  };

  return {
    'setCustomTag': setCustomTag,
    'touchCustomTag': touchCustomTag,
    'fillTagOptions': fillTagOptions,
    'clickDone': clickDone,
    'setCustomTagVisibility': setCustomTagVisibility,
    'filterTags': filterTags,
    'prepareTagData': prepareTagData
  };
})();
