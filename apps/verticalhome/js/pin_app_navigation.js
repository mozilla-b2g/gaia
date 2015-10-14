'use strict';
/* global ApplicationSource */
/* global BookmarkSource */
/* global CollectionSource */
/* global configurator */
/* global dispatchEvent */
/* global GaiaGrid */

(function(exports) {


	/**
	 * This is PinAppNavigation's constructor.
	 * @param {Object} list [DOM container that contains pin elements]
	 */
	function PinAppNavigation(list){
		if (!list &&  typeof list !== 'object'){
			console.log('List of pin apps must be an object');
			return;
		}

		this.elemList = list;
		window.removeEventListener('keydown', this);
		window.addEventListener('keydown', this);
	};


	PinAppNavigation.prototype = {

		selector: '',
		elements: null,
		preventDef: false,
		selectedElemIndex: 0,
		elemList: null,
		prevVerticalKey: null,


		/**
		 * This function reset all pinns to default values.
		 * @return {[nothing]} [nothing]
		 */
		reset: function reset(){
			this.elements.sort(function(elem1, elem2){
				if (!elem1.dataset.index || !elem2.dataset.index){
					return 1;
				}
				return elem1.dataset.index - elem2.dataset.index;
			});


			var selected = this.elemList.querySelector('.selected');

			if (selected){
				selected.classList.remove('selected')
			}

			this.selectedElemIndex = 0;

			for (var elemIndex in this.elements){
				this.elemList.appendChild(this.elements[elemIndex]);
			}

			this.elements[this.selectedElemIndex].classList.add('selected');
			this.elemList.removeAttribute('style');

			var toRemoved = this.elemList.querySelector('.removed');
			var toRemoveOutFocus = this.elemList.querySelector('.out-focus');

			if (toRemoved){
				this.elemList.removeChild(toRemoved);
			}

			if (toRemoveOutFocus){
				toRemoveOutFocus.classList.remove('out-focus');
			}

			window.removeEventListener('keydown', this);
			window.addEventListener('keydown', this);
		},


		/**
		 * This function refresh elements by selector
		 * @return {[nothins]} [nothing]
		 */
		refresh: function refresh(){
			if (!this.selector){
				console.log('Can not work without selector');
				return;
			}

			this.elements = Array.prototype.slice.call(document.querySelectorAll(this.selector));

			if (!this.elements && !this.elements.length){
				console.log('Can not find any elements by this selector');
				return;
			}

			this.elements[this.selectedElemIndex].classList.add('selected');
		},


		/**
		 * Handle event keydown
		 * @param  {[Object]} e [default object]
		 * @return {[nothing]}   [nothing]
		 */
		handleEvent: function(e){

			function cycleElements (index){

				var removed = this.elements.splice(-index, index);

				for (var i = 0; i < removed.length; i++){

					this.elemList.insertBefore(removed[i], this.elements[0 + i]);
					this.elements.splice(0 + i, 0, removed[i]);

				}

			};

			if (this.preventDef){
				e.preventDefault();
			}

			var toRemoved = this.elemList.querySelector('.removed');
			var toRemoveOutFocus = this.elemList.querySelector('.out-focus');

			if (toRemoved){
				this.elemList.removeChild(toRemoved);
			}

			if (toRemoveOutFocus){
				toRemoveOutFocus.classList.remove('out-focus');
			}


			switch(e.key){
				case 'ArrowUp':

					if (this.elemList.dataset.scrollup){
						this.elemList.style.top = this.elemList.dataset.scrollup;
					} else {
						this.elemList.style.top = '-6rem';
						this.elemList.dataset.scrollup = this.elemList.style.top;
					}

					var deltaElemsToStartScroll = 3;

					this.elements[this.selectedElemIndex].classList.remove('selected');
					if (this.selectedElemIndex >= 0 && this.selectedElemIndex < 4) {

						cycleElements.call(this,  (deltaElemsToStartScroll - this.selectedElemIndex));
						this.selectedElemIndex += deltaElemsToStartScroll - this.selectedElemIndex;

						this.selectedElemIndex --;
						this.elements[this.selectedElemIndex].classList.add('selected');

					} else {

						this.selectedElemIndex --;
						this.elements[this.selectedElemIndex].classList.add('selected');

						if (this.selectedElemIndex > 3){
							this.elemList.style.top = parseFloat(this.elemList.style.top) + 6 + 'rem';
							this.elemList.dataset.scrollup = this.elemList.style.top;
						}

					}

					var lastElem = this.elements[this.elements.length - 1];
					var clonedElem = lastElem.cloneNode(true);


					this.elemList.insertBefore(clonedElem, this.elements[0]);
					this.elements.splice(0, 0, clonedElem);
					this.elements[0].classList.add('out-focus');
					this.selectedElemIndex ++;

					lastElem.classList.add('removed');
					this.elements.splice(-1, 1);

					this.prevVerticalKey = 'up';


					break;

				case 'ArrowDown':

					this.elements[this.selectedElemIndex].classList.remove('selected');
					if (this.selectedElemIndex == (this.elements.length - 3)){
						if (!this.elemList.dataset.scrolldown){
							this.elemList.style.top = parseFloat(this.elemList.style.top) - 6 + 'rem';
							this.elemList.dataset.scrolldown = this.elemList.style.top;
						}

						this.selectedElemIndex --;

						var removed = this.elements.splice(0, 1);

						var cloned = removed[0].cloneNode(true);

						removed[0].classList.add('removed');

						this.elemList.appendChild(cloned);
						this.elements[this.elements.length] = cloned;

						this.selectedElemIndex ++;
						this.elements[this.selectedElemIndex].classList.add('selected');

						this.elemList.style.top = this.elemList.dataset.scrolldown;
					} else {
						this.selectedElemIndex ++;
						this.elements[this.selectedElemIndex].classList.add('selected');

						this.elemList.style.top = parseFloat(this.elemList.style.top) - 6 + 'rem';
						this.elemList.dataset.scrolldown = this.elemList.style.top;
					}

					this.prevVerticalKey = 'down';

					if (this.selectedElemIndex == 1){
						this.elemList.style.top = '0rem';
					}

					break;

				case 'Accept':

					window.removeEventListener('keydown', this);
					app.getAppByURL(this.elements[this.selectedElemIndex].dataset.manifesturl).launch();

					break;
			}

		},

		/**
		 * Setter to set selector
		 * @param  {string} selector [selector that the navigation can take]
		 * @return {[nothing]}          [nothing]
		 */
		set points_selector(selector){
			this.selector = selector;
			this.refresh();
		},

		/**
		 * Setter for preventDefault parameter. Default value is false.
		 * @param  {[boolean]} value [if true  preventDefault() function will be called there]
		 * @return {[nothing]}       [nothing]
		 */
		set prevent(value){
			if (typeof value === 'boolean'){
				this.preventDef = value;
			}
		}

	};

  exports.PinAppNavigation = PinAppNavigation;

}(window));
