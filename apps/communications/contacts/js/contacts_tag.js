'use strict';
/* global utils */
/* exported ContactsTag */

var ContactsTag = (function() {
  var originalTag = null;
  var selectedTag = null;
  var customTagContainer = null;
  var customTag = null;
  var customTagValue = null;

  var setCustomTag = function setCustomTag(element) {
    customTag = element;
    customTagContainer = element.parentNode;
    customTagValue = element.querySelector('#custom-tag-value');
  };

  var setCustomTagVisibility = function setCustomTagVisibility(value) {
    if (!customTag) {
      return;
    }

    if (value) {
      customTagContainer.classList.remove('hide');
    }
    else {
      customTagContainer.classList.add('hide');
    }
  };

  var markCustom = function markCustom() {
    customTag.querySelector('input').setAttribute('checked', '');
  };

  var fillTagOptions = function fillTagOptions(target, _originalTag, options) {
    utils.dom.removeChildNodes(target);
    originalTag = _originalTag;

    var selectedLink;
    /* jshint loopfunc:true */
    for (var option in options) {
      var tagLink = createLabelOption(option, options[option], tagLink, target);

      if (originalTag.dataset.value == options[option].type) {
        selectedLink = tagLink.querySelector('input');
        tagLink.querySelector('input').setAttribute('checked', '');
      }

      var tagItem = document.createElement('li');
      tagItem.setAttribute('role', 'presentation');
      tagItem.appendChild(tagLink);
      target.appendChild(tagItem);
    }

    customTagValue.textContent = '';
    if (!selectedLink && originalTag.dataset.value) {
      customTagValue.textContent = originalTag.dataset.value;
      markCustom();
    } else {
      customTagValue.textContent = 'Custom';
    }
    selectTag(selectedLink);
  };

  var createLabelOption = function createLabelOption(key, option){
    var tagLabel = document.createElement('label');

    var tagRadio = document.createElement('input');
    tagRadio.setAttribute('type', 'radio');
    tagRadio.setAttribute('name', 'contact-radio');
    tagRadio.dataset.index = key;
    tagRadio.setAttribute('data-l10n-id', option.type);
    tagRadio.setAttribute('data-value', option.type);
    tagRadio.setAttribute('role', 'option');
    tagLabel.appendChild(tagRadio);

    var tagSpan = document.createElement('span');
    tagSpan.setAttribute('data-icon', 'tick');
    var tagSpanText = document.createTextNode(option.value);
    tagSpan.appendChild(tagSpanText);
    tagLabel.appendChild(tagSpan);
    
    return tagLabel;
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
    selectedTag = 
      document.querySelector('[type="radio"][name="contact-radio"]:checked');
    if (selectedTag && !selectedTag.getAttribute('is-custom')) {
      originalTag.textContent = selectedTag.dataset.value;
      originalTag.dataset.l10nId = selectedTag.dataset.l10nId;
      originalTag.dataset.value = selectedTag.dataset.value;
    } else if (customTagValue.textContent.length > 0) {
      originalTag.textContent = customTagValue.textContent;
      originalTag.dataset.value = customTagValue.textContent;
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
    'fillTagOptions': fillTagOptions,
    'clickDone': clickDone,
    'setCustomTagVisibility': setCustomTagVisibility,
    'filterTags': filterTags
  };
})();
