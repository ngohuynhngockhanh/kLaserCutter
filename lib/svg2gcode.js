var SVGReader	=	require('./SVGReader');
function floatval(value) {
	return (parseFloat(value) || 0);
}
module.exports = {
	svg2gcode : function(svg, settings) {
		// clean off any preceding whitespace
		svg = svg.replace(/^[\n\r \t]/gm, '');
		settings = settings || {};
		settings.scale = settings.scale || 0.28221931976;	// slace
		settings.feedRate = settings.feedRate || 1400;	//engraving speed
	  
		var
			scale=function(val) {
	    		return val * settings.scale
	  		},
			SVGDom = require('domino').createWindow(svg).document,
	  		paths = SVGReader.parse(svg, {}).allcolors,
	  		gcode,
	  		path,
	  		idx = paths.length,	// paths count
			pageHeight = SVGDom.querySelector('svg').getAttribute("height");	//pageHeight for adjust Y coordinate
		if (pageHeight) {	
			if (pageHeight.indexOf("mm") > 0)
				pageHeight = floatval(pageHeight)
			else if (pageHeight.indexOf("in") > 0)
				pageHeight = floatval(pageHeight) * 25.4000008381; // in / mm
			else if (pageHeight.indexOf("pt") > 0)
				pageHeight = floatval(pageHeight) * 0.35277777517;
			else if (pageHeight.indexOf("m") > 0)
				pageHeight = floatval(pageHeight) * 1000;
			else if (pageHeight.indexOf("cm") > 0)
				pageHeight = floatval(pageHeight) * 10;
			else if (pageHeight.indexOf("ft") > 0)
				pageHeight = floatval(pageHeight) * 304.799827588;
			else if (pageHeight.indexOf("pc") > 0) 
				pageHeight = floatval(pageHeight) * 4.23333093872; // 3.54330708653 = a4 height (px) / a4 height (mm)
			else if (pageHeight.indexOf("px") > 0) 
				pageHeight = floatval(pageHeight) / 3.54330708653; // 3.54330708653 = a4 height (px) / a4 height (mm)
			else 
				pageHeight = floatval(pageHeight) / 3.54330708653; // 3.54330708653 = a4 height (px) / a4 height (mm)	
		} else	
	 		pageHeight = 297;
		
	  	while(idx--) {
	    	var subidx = paths[idx].length;
	    	var bounds = { x : Infinity , y : Infinity, x2 : -Infinity, y2: -Infinity, area : 0};
	    	// find lower and upper bounds
	    	while(subidx--) {
		    	if (paths[idx][subidx].x < bounds.x) {
		        	bounds.x = paths[idx][subidx].x;
		      	}
	
	      		if (paths[idx][subidx].y < bounds.y) {
	        		bounds.y = paths[idx][subidx].y;
	      		}
	
	      		if (paths[idx][subidx].x > bounds.x2) {
	        		bounds.x2 = paths[idx][subidx].x;
	      		}
	      		if (paths[idx][subidx].y > bounds.y2) {
	        		bounds.y2 = paths[idx][subidx].y;
	      		}
	    	}
	
	    	// calculate area
	    	bounds.area = (1 + bounds.x2 - bounds.x) * (1 + bounds.y2-bounds.y);
	    	paths[idx].bounds = bounds;
	  	}
		/*
	  	// cut the inside parts first
	  	paths.sort(function(a, b) {
	    	// sort by area
	  		return (a.bounds.area < b.bounds.area) ? -1 : 1;
	  	});
	  	*/
	  	gcode = [
	    	'G90',	// Absolute coordinate mode. Oxyz
	    	'G21',	// Unit: mm
			'S1000',	//turn laser on
	  	];
	
	  	for (var pathIdx = 0, pathLength = paths.length; pathIdx < pathLength; pathIdx++) {
	    	path = paths[pathIdx];
	    	// seek to index 0
	    	gcode.push(['G0',
	      		'X' + scale(path[0].x),
	      		'Y' + (scale(-path[0].y) + pageHeight),
	    	].join(''));
	
	    
	
	      	// begin the cut by dropping the tool to the work
	      	gcode.push('M03');
	
	      	// keep track of the current path being cut, as we may need to reverse it
	      	var localPath = [];
	      	for (var segmentIdx=0, segmentLength = path.length; segmentIdx<segmentLength; segmentIdx++) {
	        	var segment = path[segmentIdx];
	
	        	var localSegment = ['G1',
	          		'X' + scale(segment.x),
	          		'Y' + (scale(-segment.y) + pageHeight),
	          		'F' + settings.feedRate
	        		].join('');
	
		        // feed through the material
		        gcode.push(localSegment);
		
	        }
	        
	    	// turn off the spindle
	    	gcode.push('M05');
	  	}
	
	
		// go home
		gcode.push('G00 X0 Y0 ');
	
		return gcode.join("\r");
	}
};