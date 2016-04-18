/* global SharedUtils, Application, Deck, AppBookmark, Folder */

(function(exports) {
  'use strict';

  const FULLSIZED_ICON = 336 * (window.devicePixelRatio || 1);
  const DEFAULT_ICON = 'url("/style/images/appic_developer.png")';
  const DEFAULT_BGCOLOR = 'rgba(0, 0, 0, 0.5)';
  const DEFAULT_BGCOLOR_ARRAY = [0, 0, 0, 0.5];

  var CardUtil = {
    init: function(cardManager) {
      this.cardManager = cardManager;
    },

    _fillCardIcon: function(cardButton, card) {
      var manifestURL = card.nativeApp && card.nativeApp.manifestURL;
      var that = this;
      // We have thumbnail which is created by pin
      if (card.thumbnail) {
        this._setCardIcon(cardButton, card, card.thumbnail,
                          card.backgroundColor);
        // TODO add backgroundColor??? How to do it???
      } else if (!card.cachedIconBlob) {
        // We don't have cachedIconBlob, just get icon from app
        this.cardManager.getIconBlob({
          manifestURL: manifestURL,
          entryPoint: card.entryPoint,
          // XXX: preferredSize should be determined by
          // real offsetWidth of cardThumbnailElem instead of hard-coded value
          preferredSize: FULLSIZED_ICON
        }).then(function(iconData) {
          var blob = iconData[0];
          var size = iconData[1];
          if (size >= FULLSIZED_ICON) {
            that._setCardIcon(cardButton, card, blob, null);
          } else {
            that._getIconColor(blob, function(color, err) {
              if (err) {
                that._setCardIcon(cardButton, card, blob, DEFAULT_BGCOLOR);
              } else {
                that._setCardIcon(cardButton, card, blob, 'rgba(' + color[0] +
                  ', ' + color[1] + ', ' + color[2] + ', ' + color[3] + ')');
              }
            });
          }
          card.cachedIconBlob = blob;
        });
      } else if (card.cachedIconBlob) {
        // We already have cacedIconBlob which is created by previous step.
        this._setCardIcon(cardButton, card, card.cachedIconBlob,
                          card.backgroundColor);
      }
    },

    _setCardIcon: function (cardButton, card, blob, bgColor) {
       try {
        var bgUrl = URL.createObjectURL(blob);
        if (bgColor) {
          cardButton.style.backgroundColor = bgColor;
          cardButton.classList.add('fitted');
          card.backgroundType = 'fitted';
        } else {
          cardButton.classList.add('fullsized');
          card.backgroundType = 'fullsized';
        }
        cardButton.dataset.revokableURL = bgUrl;
        cardButton.style.backgroundImage = 'url("' + bgUrl + '")';
      } catch (e) {
        // If the blob is broken, we may get an exception while creating object
        // URL.
        cardButton.style.backgroundImage = DEFAULT_ICON;
        cardButton.style.backgroundColor = DEFAULT_BGCOLOR;
      }
    },

    _getIconColor: function(blob, callback) {
      var dy = 0;
      function checkColor(color, err) {
        if (err) {
          callback(null, err);
        } else if (color[3] < 255 && dy < 0.5) {
          dy += 0.25;
          SharedUtils.readColorCode(blob, 0.5, dy, checkColor);
        } else {
          callback(color[3] < 255 ? DEFAULT_BGCOLOR_ARRAY : color, err);
        }
      }

      SharedUtils.readColorCode(blob, 0.5, 0, checkColor);
    },

    _createWave: function(cardButton, card) {

      // deck's icon using gaia font
      var deckIcon = document.createElement('span');
      deckIcon.className = 'icon';
      deckIcon.dataset.icon = card.deckClass;

      // front wave of a deck
      var waveFront = document.createElement('div');
      waveFront.className = 'deck-wave';
      waveFront.classList.add('wave-front');
      waveFront.classList.add(card.deckClass + '-wave-front');
      waveFront.classList.add('wave-paused');

      // back wave of a deck
      var waveBack = document.createElement('div');
      waveBack.className = 'deck-wave';
      waveBack.classList.add('wave-back');
      waveBack.classList.add(card.deckClass + '-wave-back');

      cardButton.appendChild(waveBack);
      cardButton.appendChild(deckIcon);
      cardButton.appendChild(waveFront);
      cardButton.classList.add('deck-' + card.deckClass);
    },

    _localizeCardName: function(elem, card) {
      if (!elem || !card) {
        return;
      }

      // We should use user given name first, otherwise we use localized
      // application/deck name.
      var lang = document.documentElement.lang;
      var name = this.cardManager.resolveCardName(card, lang);
      if (name && name.raw) {
        elem.removeAttribute('data-l10n-id');
        elem.textContent = name.raw;
      } else if (name && name.id) {
        SharedUtils.localizeElement(elem, name);
      }
    },

    revokeFolderCardIcons: function(cardButton) {
      var folderContentContainer =
        cardButton.querySelector('.folder-content-container');

      if (folderContentContainer) {
        var subCardElems = folderContentContainer.getElementsByTagName('div');
        Array.from(subCardElems).forEach((subCardElem) => {
          if (subCardElem.dataset.revokableURL) {
            URL.revokeObjectURL(subCardElem.dataset.revokableURL);
          }
        });
      }
    },

    createCardButton: function(card, disableWave) {
      var cardButton = document.createElement('smart-button');
      cardButton.setAttribute('type', 'app-button');
      cardButton.className = 'app-button';
      cardButton.dataset.cardId = card.cardId;

      // XXX: will support Folder and other type of Card in the future
      // for now, we only create card element for Application and Deck
      if (card instanceof Application) {
        if (card.group === 'tv') {
          cardButton.classList.add('tv-channel');
          cardButton.dataset.icon = 'tv';
          cardButton.setAttribute('app-type', 'tv');
        } else {
          cardButton.setAttribute('app-type', 'app');
          this._fillCardIcon(cardButton, card);
        }
      } else if (card instanceof Deck) {
        cardButton.setAttribute('app-type', 'deck');
        if (card.group === 'website' || disableWave) {
          this._fillCardIcon(cardButton, card);
        } else {
          this._createWave(cardButton, card);
        }
      } else if (card instanceof AppBookmark) {
        cardButton.setAttribute('app-type', 'appbookmark');
        this._fillCardIcon(cardButton, card);
      } else if (card instanceof Folder) {
        cardButton.setAttribute('app-type', 'folder');
        this.updateFolderCardIcons(cardButton, card);
      }

      // For smart-button, we put card name in pseudo-element :after. However,
      // we need to localize card name and l10n library do not support
      // localizing element with children elements.
      // Instead of using :after, we create a 'span' element under smart-button
      // and put card name in it.
      var nameSpan = document.createElement('span');
      nameSpan.classList.add('name');
      this._localizeCardName(nameSpan, card);
      cardButton.appendChild(nameSpan);

      return cardButton;
    },

    updateCardName: function(cardButton, card) {
      var spans =
           SharedUtils.nodeListToArray(cardButton.getElementsByTagName('span'));
      spans.forEach(span => {
        if (span.classList.contains('name')) {
          this._localizeCardName(span, card);
        }
      });
    },

    updateFolderCardIcons: function(cardButton, card) {
      var subCardElemCache = {};

      var folderContentContainer =
        cardButton.querySelector('.folder-content-container');
      if (folderContentContainer) {
        var subCardElems = folderContentContainer.getElementsByTagName('div');
        Array.from(subCardElems).forEach((subCardElem) => {
          subCardElemCache[subCardElem.dataset.id] = subCardElem;
        });
        cardButton.removeChild(folderContentContainer);
      }

      folderContentContainer = document.createElement('div');
      folderContentContainer.classList.add('folder-content-container');

      card.getCardList().forEach((subCard) => {
        var subCardElem = subCardElemCache[subCard.cardId];

        if (!subCardElem) {
          subCardElem = document.createElement('div');
          subCardElem.dataset.id = subCard.cardId;

          var needNameSpan = false;
          var needCardName = false;
          var needFillCardIcon = true;

          if (subCard instanceof Application) {
            switch (subCard.group) {
              case 'tv':
                subCardElem.dataset.icon = 'tv';
                subCardElem.classList.add('tv-channel');
                needCardName = true;
                needFillCardIcon = false;
                break;
              case 'website':
                needNameSpan = true;
                break;
            }
          }

          if (needCardName || needNameSpan) {
            var nameSpan = document.createElement('span');
            if (needCardName) {
              this._localizeCardName(nameSpan, subCard);
            }
            subCardElem.appendChild(nameSpan);
          }

          if (needFillCardIcon) {
            this._fillCardIcon(subCardElem, subCard);
          }
        }

        folderContentContainer.appendChild(subCardElem);
        delete subCardElemCache[subCard.cardId];
      });

      for (var id in subCardElemCache) {
        if (subCardElemCache[id].dataset.revokableURL) {
          URL.revokeObjectURL(subCardElemCache[id].dataset.revokableURL);
        }
        delete subCardElemCache[id];
      }

      cardButton.appendChild(folderContentContainer);
    }
  };
  exports.CardUtil = CardUtil;
}(window));
