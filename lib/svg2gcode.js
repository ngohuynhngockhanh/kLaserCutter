var SVGReader	=	require('./SVGReader'),
	phpjs		=	require('phpjs');
var unitConst = {
		'mm': 	1,
		'in':   25.4000008381,
		'pt':   0.35277777517,
		'm' :   1000,
		'cm':   10,
		'ft':   304.799827588,
		'pc':   4.23333093872,
		'px':   0.28222222222
		
	};
module.exports = {
	svg2gcode : function(svg, settings) {
		// clean off any preceding whitespace
		svg = svg.replace(/^[\n\r \t]/gm, '');
		settings = settings || {};
		settings.scale = settings.scale || unitConst.px;	// slace
		settings.feedRate = settings.feedRate || 1400;	//engraving speed
	  
		var
			scale=function(val) {
	    		return val * settings.scale
	  		},
			SVGDom = require('domino').createWindow(svg).document,
	  		gcode,
	  		path,	  		
	  		
			pageHeight = SVGDom.querySelector('svg').getAttribute("height");	//pageHeight for adjust Y coordinate
		var unit;
		if (pageHeight) {	
			var ok = false;
			for (unit in unitConst) {
				if (pageHeight.indexOf(unit) > -1) {
					ok = true;
					pageHeight = phpjs.floatval(pageHeight) * unitConst[unit];
					break;
				}
					
			}
			if (!ok) {
				pageHeight = phpjs.floatval(pageHeight) * unitConst.px;
				unit = 'px';
			}
		} else {	
	 		pageHeight = 297;
	 		unit = 'px';
	 	}
		
		//get all paths
		var paths = SVGReader.parse(svg, {unitConst: unitConst[unit] / unitConst.px}).allcolors,
			idx = paths.length;	// paths count
		var sqr = function(a) {
			return a * a;
		};
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
			bounds.sqrX = sqr(bounds.x);
			bounds.sqrY = sqr(bounds.y);
			bounds.sqrXplusSqrY = bounds.sqrX + bounds.sqrY;
	    	paths[idx].bounds = bounds;
	  	}
		
	  	// cut the inside parts first
	  	paths.sort(function(a, b) {
	    	// sort by distance from 0,0
	  		return (a.bounds.sqrXplusSqrY < b.bounds.sqrXplusSqrY) ? -1 : 1;
	  	});
	  	
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
	    	].join(' '));
	
	    
	
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
	        		].join(' ');
	
		        // feed through the material
		        gcode.push(localSegment);
		
	        }
	        
	    	// turn off the spindle
	    	gcode.push('M05');
	  	}
	
	
		// go home
		gcode.push('G00 X0 Y0 ');
	
		return gcode.join("\r\n");
	}
};