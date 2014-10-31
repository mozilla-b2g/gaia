'use strict';
/* global utils */
/* exported ContactsTag */

var ContactsTag = (function() {
  var originalTag = null;
  var selectedTag = null;
  var customTag = null;

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

  var unMarkTag = function unMarkTag() {
    var tag = 
      document.querySelector('[type="radio"][name="contact-radio"]:checked');
    if(tag) {
      tag.checked = false;
    }
  };

  var touchCustomTag = function touchCustomTag(callback) {
    unMarkTag();

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
      var tagLink = document.createElement('label');

      var tagLinkRadio = document.createElement('input');
      tagLinkRadio.setAttribute('type', 'radio');
      tagLinkRadio.setAttribute('name', 'contact-radio');
      tagLinkRadio.dataset.index = option;
      tagLinkRadio.setAttribute('data-l10n-id', options[option].type);
      tagLinkRadio.setAttribute('data-value', options[option].type);
      tagLinkRadio.setAttribute('role', 'option');
      tagLink.appendChild(tagLinkRadio);

      var tagLinkSpan = document.createElement('span');
      tagLinkSpan.setAttribute('data-icon', 'tick');
      var tagLinkSpanText = document.createTextNode(options[option].value);
      tagLinkSpan.appendChild(tagLinkSpanText);
      tagLink.appendChild(tagLinkSpan);

      if (originalTag.dataset.value == options[option].type) {
        selectedLink = tagLinkRadio;
      }

      var tagItem = document.createElement('li');
      tagItem.setAttribute('role', 'presentation');
      tagItem.appendChild(tagLink);
      target.appendChild(tagItem);
    }

    customTag.value = '';
    if (!selectedLink && originalTag.dataset.value) {
      customTag.value = originalTag.dataset.value;
    }
    selectTag(selectedLink);
  };

  var selectTag = function selectTag(tag) {
    if (tag == null) {
      return;
    }
    tag.setAttribute('checked', '');
    //Clean any trace of the custom tag
    customTag.value = '';
    
    selectedTag = tag;
  };

  var clickDone = function clickDone(callback) {
    var selectedTag = 
      document.querySelector('[type="radio"][name="contact-radio"]:checked');
    if (selectedTag) {
      originalTag.textContent = selectedTag.dataset.value;
      originalTag.dataset.l10nId = selectedTag.dataset.l10nId;
      originalTag.dataset.value = selectedTag.dataset.value;
    } else if (customTag.value.length > 0) {
      originalTag.textContent = customTag.value;
      originalTag.dataset.value = customTag.value;
    }
    originalTag = null;

    if (callback !== undefined && typeof callback === 'function') {
      callback();
    }
  };

  // Filter tags to be shown when selecting an item type (work, birthday, etc)
  // This is particularly useful for dates as we cannot have multiple instances
  // of them (only one birthday, only one anniversary)
  function filterTags(type, currentNode, tags) {
    var element = document.querySelector(
                          '[data-template]' + '.' + type + '-' + 'template');
    if (!element || !element.dataset.exclusive) {
      return tags;
    }

    // If the type is exclusive the tag options are filtered according to
    // the existing ones
    var newOptions = tags.slice(0);

    var sameType = document.querySelectorAll('.' + type + '-template');
    if (sameType.length > 1) {
      /* jshint loopfunc:true */
      for (var j = 0; j < sameType.length; j++) {
        var itemSame = sameType.item(j);
        var tagNode = itemSame.querySelector('[data-field="type"]');
        if (tagNode !== currentNode &&
            !itemSame.classList.contains('facebook')) {
          newOptions = newOptions.filter(function(ele) {
            return ele.type != tagNode.dataset.value;
          });
        }
      }
    }

    return newOptions;
  }

  return {
    'setCustomTag': setCustomTag,
    'touchCustomTag': touchCustomTag,
    'fillTagOptions': fillTagOptions,
    'clickDone': clickDone,
    'setCustomTagVisibility': setCustomTagVisibility,
    'filterTags': filterTags
  };
})();
