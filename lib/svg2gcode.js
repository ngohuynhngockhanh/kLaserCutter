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
			paths[idx].sqrX = sqr(paths[idx][0].x);
			paths[idx].sqrY = sqr(paths[idx][0].y);
			paths[idx].sqrXplusSqrY = paths[idx].sqrX + paths[idx].sqrY;
	  	}
	  	
	  	
	  	//sort by circle
	  	quickSort(paths, 0, paths.length - 1, function(a, b) {
	  		return a.sqrXplusSqrY - b.sqrXplusSqrY;
	  	});
	  	
	  	function  quickSort(arr, left, right, func) {
		  var i = left;
		  var j = right;
		  var tmp;
		  pivotidx = (left + right) / 2; 
		  var pivot = arr[pivotidx.toFixed()];  
		  /* partition */
		  while (i <= j) {
		     while (func(arr[i], pivot))
		           i++;
		     while (func(pivot, arr[j]))
		           j--;
		     if (i <= j) {
		           tmp = arr[i];
		           arr[i] = arr[j];
		           arr[j] = tmp;
		           i++;
		           j--;
		     }
		  }
		
		  /* recursion */
		  if (left < j)
		        quickSort(arr, left, j, func);
		  if (i < right)
		        quickSort(arr, i, right, func);
		  return arr;
		}
	  	
	  	gcode = [
	    	'G90',	// Absolute coordinate mode. Oxyz
	    	'G21',	// Unit: mm
			'S1000',	//turn laser on
	  	];
	
	  	for (var pathIdx = 0, pathLength = paths.length; pathIdx < pathLength; pathIdx++) {
	    	path = paths[pathIdx];
	    	// seek to index 0
	    	gcode.push(['G0',
	      		'X' + phpjs.round(scale(path[0].x), 5),
	      		'Y' + phpjs.round((scale(-path[0].y) + pageHeight), 5),
	    	].join(' '));
	
	    
	
	      	// begin the cut by dropping the tool to the work
	      	gcode.push('M03');
	
	      	// keep track of the current path being cut, as we may need to reverse it
	      	var localPath = [];
	      	for (var segmentIdx=1, segmentLength = path.length; segmentIdx<segmentLength; segmentIdx++) {
	        	var segment = path[segmentIdx];
	
	        	var localSegment = ['G1',
	          		'X' + phpjs.round(scale(segment.x), 5),
	          		'Y' + phpjs.round((scale(-segment.y) + pageHeight), 5),
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