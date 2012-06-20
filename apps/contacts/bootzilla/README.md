Bootzilla
=========

Bootzilla is a suite of CSS components and JS components and utilities for developing apps in B2G.

You should not modify your local copy of bootzilla, if you have some extra requirments or need and new component just make a pull request,
or contact directly with the owners/collaborators.

Folder structure:
------------
	/style
		/gphx
			/bitmap 				=> Bitmap images used in the UI, mainly icons
				/default
				/high
				/xhigh
			/vector
		/css
			/base
				root.css 			=> All base styles that we need to normalize the starting point for cross-browser development.
				fonts.css 			=> All the font families used in B2G
				app.css 			=> Common set-up for creating app layouts
				package.css 		=> Includes: All the CSS files in the same folder
			/components
				buttons.css 		=> All the button types and structures related that the system provides
				icons.css 			=> Icons provided by the system, could be bitmaps, fonts, or svg
				layout.css 			=> Low and medium level components for setting up responsive strcutures
				forms.css 			=> Low and medium structures for creating forms
				lists.css 			=> High level strcutures for crafting lists
				navigations.css 	=> High level strcutures for navigation use cases
				package.css 		=> Includes: All the CSS files in the same folder
			package.css 			=> Includes: All the CSS files in bootzilla

	/js
		/base
			responsive.js 				=> Allows to scale the UI smotthly as per the device dpi
		/components
			infinite-scroll.js 			=> Component for creating typical autoload items list
	      /utilities
	        templates.js 					=> Simple templating mechanism
	        xml-events.js 				=> Declarative event handler registration
	        multicard.js 					=> In-page transitions
	        appstates.js 					=> Dealing with application states and CSS
	        logger.js 						=> Dealing with logs in a clean manner
	        builder.js 						=> Construct XML cleanly by implementing the builder pattern

	/examples 							=> Here you will find an index with all the availables examples
	
