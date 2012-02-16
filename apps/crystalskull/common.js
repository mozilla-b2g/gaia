function setLabels(title, desc, madeBy) {
	
	var mb = (madeBy != null) ? madeBy : true;
	
	document.write("<div id='header'>" + title + "</div>");
	
	if(!isLocalhost() && mb) {
		document.write("<div id='madewith'>made with <a href='https://github.com/drojdjou/J3D' id='j3dlink'>J3D</a><br><a href='http://twitter.com/share' class='twitter-share-button' data-count='horizontal' data-via='bartekd'>Tweet</a><script type='text/javascript' src='http://platform.twitter.com/widgets.js'></script></div>");
	}
	
	if (desc) {
		document.write("<div id='details'>" + desc + "</div>");
	}
	
}

function updateDesc(s) {
	document.getElementById("details").innerHTML = s;
}

function checkWebGL() {
	if (!
		( function () { 
			try { 
				return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); 
			} catch( e ) { 
				return false; 
			} 
		} 
		)() 
	)
	{
		document.write("<div id='nowebgl'>Oh no! Your browser or GPU does not seem to like WebGL. Click <a href='http://doesmybrowsersupportwebgl.com/'>here</a> to learn more.</div>");
		return false;
	} else {
		return true;
	}
}

function isLocalhost() {
	return document.location.host.indexOf("localhost") > -1;
}


