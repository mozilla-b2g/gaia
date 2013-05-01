'use strict'

var ContactsTag = (function() {
  var customTag = document.getElementById('custom-tag');
  var selectedTag = null;
  var contactTag = null;
  var tagOptions = null;

  var getCustomTag = function getCustomTag() {
    return customTag;
  };

  var setSelectedTag = function setSelectedTag(_selectedTag) {
    selectedTag = _selectedTag;
  };  

  var getSelectedTag = function getSelectedTag() {
    return selectedTag;
  };

  var setContactTag = function setContactTag(_contactTag) {
    contactTag = _contactTag;
  };

  var getContactTag = function getContactTag() {
    return contactTag;
  };
  
  var loadTagOptions = function setTagOptions() {
    var _ = navigator.mozL10n.get;
    tagOptions = {
      'phone-type' : [
        {value: _('mobile')},
        {value: _('home')},
        {value: _('work')},
        {value: _('personal')},
        {value: _('faxHome')},
        {value: _('faxOffice')},
        {value: _('faxOther')},
        {value: _('another')}
      ],
      'email-type' : [
        {value: _('personal')},
        {value: _('home')},
        {value: _('work')}
      ],
      'address-type' : [
        {value: _('home')},
        {value: _('work')}
      ]
    };
  };

  var getTagOptions = function getTagOptions() {
    return tagOptions;
  };

  var fillTagOptions = function fillTagOptions(options, tagList, update) {
    var container = document.getElementById('tags-list');
    container.innerHTML = '';
    contactTag = update;

    var selectedLink;
    for (var option in options) {
      var link = document.createElement('button');
      link.dataset.index = option;
      link.textContent = options[option].value;

      link.onclick = function(event) {
        var index = event.target.dataset.index;

        selectTag(event.target, tagList);
        event.preventDefault();
      };

      if (update.textContent == tagOptions[tagList][option].value) {
        selectedLink = link;
      }

      var list = document.createElement('li');
      list.appendChild(link);
      container.appendChild(list);
    }

    // Deal with the custom tag, clean or fill
    customTag.value = '';
    if (!selectedLink && update.textContent) {
      customTag.value = update.textContent;
    }

    selectTag(selectedLink);
  };

  var selectTag = function selectTag(link, tagList) {
    if (link == null) {
      return;
    }

    //Clean any trace of the custom tag
    customTag.value = '';

    var index = link.dataset.index;

    if (selectedTag instanceof Object) {
      selectedTag.removeAttribute('class');
    }
    
    link.className = 'icon icon-selected';
    selectedTag = link;
  };

  return {
    'getCustomTag': getCustomTag,
    'setSelectedTag': setSelectedTag,
    'getSelectedTag': getSelectedTag,
    'setContactTag': setContactTag,
    'getContactTag': getContactTag,
    'loadTagOptions': loadTagOptions,
    'getTagOptions': getTagOptions,
    'fillTagOptions': fillTagOptions
  };
})();
