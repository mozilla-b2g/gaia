/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const
	MESSAGES_PER_PAGE = 10,
  PAGES_LENGTH = 5,
  TRANSITION_PADDING = 20,
  PAGE_TRANSITION_DURATION = 300;

var mail = {
	loadMessages: function(success, error){
		var xhr = new XMLHttpRequest();

		xhr.open('GET', 'fakemsgs.json', true);

		xhr.onload = function(e){
			try{
				success && success.call(xhr, JSON.parse(xhr.response));
			}catch(e){
				error && error.call(xhr, e);
			}
		};

		xhr.onerror = function(e){
			error && error.call(xhr, e);
		};

		xhr.send(null);
	},
	loadFolder: function(){

	},
	folder: 'inbox'
};

var nodes = {},
	loading = [],
	load = function(callback){
		var fn = function(){
			if(loading.done) return null;

				loading.splice(loading.indexOf(fn), 1);

				let result = callback.apply(this, arguments);

				if(!loading.length){
					loading.done = true;
					let event = new CustomEvent('apploaded');

					document.dispatchEvent(event);
				}

				return result;
		};

		loading.push(fn);

		return fn;
	};

mail.loadMessages(load(function(data){
	console.log(data);
}));

document.addEventListener('DOMContentLoaded', load(function(){
  [
    'account',
    'folder',
    'messages',
    'main'
  ].forEach(function(id){
    var target = document.getElementById(id);

    if(target){
      nodes[id] = target;
    }

  });
}), true);

window.addEventListener('localized', load(function(){
  var html = document.documentElement,
    lang = document.mozL10n.language;

  html.setAttribute('lang', lang.code);
  html.setAttribute('dir', lang.direction);

  document.body.classList.remove('hidden');
}));


document.addEventListener('apploaded', function(){
  var messagePage = nodes.messages.querySelector('.message-page'),
    pages = [],
    currentPage = 0,
    stopTransition = function(){
      for(var i = -1; i < 2; i++){
        pages[currentPage + i] && Transition.stop(pages[currentPage + i]);
      }
    };

  var updatePages = function(page){
    var tmp;

    if(tmp = pages[page - 1]){
      tmp.style.display = 'block';
      tmp.style.MozTransform = Transform.translate(-window.innerWidth - TRANSITION_PADDING);
    }

    if(tmp = pages[page + 1]){

      if(!tmp.offsetWidth && !tmp.offsetHeight)
        nodes.messages.appendChild(tmp).style.display = 'block';

      tmp.style.MozTransform = Transform.translate(window.innerWidth + TRANSITION_PADDING);
    }

  };

  nodes.messages.removeChild(messagePage);

  for(let i = PAGES_LENGTH; i--;){
    pages.push(messagePage.cloneNode(true));
  }

  nodes.messages.zIndex = 0;
  pages.forEach(function(page, i){
    page.style.zIndex = pages.length - i;
    page.style.display = 'none';
  });

  nodes.messages.appendChild(pages[currentPage]).style.display = 'block';

  updatePages(currentPage);

  window.addEventListener('resize', function(){
    updatePages(currentPage);
  }, true);

	var swipeMove = function(e){
    //if(e.detail === SWIPE_HORIZONTAL){
    var local = e.clientX - swipeStart,
      dir = local < 0 ? 1 : -1,
      tmp;

    offset = Math.max(Math.min(local, window.innerWidth + TRANSITION_PADDING), -window.innerWidth - TRANSITION_PADDING);

    var transform = new Transform({
      translate: offset
    });

    pages[currentPage].style.MozTransform = transform;

    if(tmp = pages[currentPage + dir]){
      tmp.style.MozTransform = new Transform({
        translate: offset + window.innerWidth * dir + TRANSITION_PADDING * dir
      });
    }
  },
    swipeStart,
    offset = 0,
    swipeEnd = function(e){
      var dir,
          next,
          factor;

      dir = offset < 0 ? 1 : -1;
      next = currentPage + (Math.abs(offset) > window.innerWidth / 4 ? dir : 0);
      factor = (TRANSITION_PADDING + window.innerWidth - Math.abs(offset)) / (window.innerWidth + TRANSITION_PADDING);

      stopTransition();

      Transition.run(pages[next] || pages[currentPage], {
        MozTransform: 'translate(0)'
      }, {
        duration: factor * PAGE_TRANSITION_DURATION
      }, function(){
        updatePages(currentPage);
      });

      if(next !== currentPage && pages[next]){
        Transition.run(pages[currentPage], {
          MozTransform: Transform.translate((window.innerWidth + TRANSITION_PADDING) * dir * -1)
        }, {
          duration: factor * PAGE_TRANSITION_DURATION
        });
        currentPage = next;
      }else{
        let tmp = pages[currentPage + dir];
        tmp && Transition.run(tmp, {
          MozTransform: Transform.translate((window.innerWidth + TRANSITION_PADDING) * dir)
        }, {
          duration: factor * PAGE_TRANSITION_DURATION
        });
      }

      document.removeEventListener('mousemove', swipeMove);
      document.removeEventListener('swipeend', swipeEnd);
    };
	nodes.main.addEventListener('swipestart', function(e){
    //Transition.stop(pages[currentPage]);
    //console.log(e.detail, SWIPE_HORIZONTAL);
		if(e.detail & SWIPE_HORIZONTAL){
      stopTransition();
      swipeStart = e.clientX;
      pages[currentPage].style.MozTransition = '';
      document.addEventListener('mousemove', swipeMove);
      document.addEventListener('swipeend', swipeEnd);
    }
	});

	nodes.main.addEventListener('tapstart', function(e){
		console.log('tapstart');
	});
  nodes.main.addEventListener('tapend', function(e){
		console.log('tapend');
	});
  nodes.main.addEventListener('longtapstart', function(e){
		console.log('longtap');
	});
});