/**
* This file is used to implement the logical functions that used in the HTML files.
*/

if(!window.litejs) {
	window.litejs = new function() {				
		function serializeAttrs(atts) {
			var out = '';
			var num = atts.length;
			
			for(var i = 0; i < num; i++) {
				out += ' ' + atts[i].name + "=" + '"' + atts[i].value + '"'; 
			}
			
			return out;
		}
		
		// Constructor for an element
		this.ele = function(name,myParent) {
			var eleName;
			var eleText;
		
			var attrs = new Array();
			var children = new Array();
		
			eleName = name;
			
			if(myParent) {
				this.parent = myParent;
				this.parent.child(this);
			}
			
			// Attributes
			this.attr = function(attr,val) {
				attrs.push({name: attr,value: val});
				return this;
			}
			
			// Bulk assignment of attributes
			this.attrs = function(attrArray) {
			}
			
			// Adds a new child and returns it
			this.child = function(child) {
				var ele;
				
				if(typeof child == "string") {
					ele = new litejs.ele(child,this);
				}
				else if(typeof child == "object") {
						ele = child;
						children.push(ele);	
				}
				
				return ele;
			}
			
			// Text
			this.text = function(text) {
				eleText = text;
				return this;
			}
			
			// build function
			this.build = function() {
				var out ='<';
				out += eleName;
				
				out += serializeAttrs(attrs);
											
				out += '>';
				
				// For each of the children serialize
				var numc = children.length;
				for(var i = 0; i < numc; i++) {
					out += children[i].build();
				}
				
				// Text of the ement
				if(eleText) {
					out += eleText;
				}
				
				out += '</' + eleName + '>';
				
				return out;
			}
			
			thisbuildDOM = function() {
				
			}
			
			// adding a sibling
			this.sibling = function(sibling) {
				return this;
			}
		}
	}
}