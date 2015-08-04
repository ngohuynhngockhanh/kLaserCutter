var SVGReader	=	require('./SVGReader'),
	phpjs		=	require('phpjs'),
	graham		=	require('./graham_scan');
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
		var _paths = SVGReader.parse(svg, {unitConst: unitConst[unit] / unitConst.px}).allcolors;
			//idx = paths.length;	// paths count
		/*var sqr = function(a) {
			return a * a;
		};
		console.log(idx);
	  	while(idx--) {
			var bounds = {};
			bounds.sqrX = paths[idx][0].x;
			bounds.sqrY = paths[idx][0].y;
			bounds.sqrXplusSqrY = bounds.sqrX + bounds.sqrY;
			bounds.sqrXplusSqrY = bounds.sqrX + bounds.sqrY;
	    	paths[idx].bounds = bounds;
	  	}*/
		
		//Create a new instance.
		var pointHeap = [], pointHeapOrigin;
		for (var i = 0; i < _paths.length; i++) {
			var path = _paths[i];
			pointHeap.push({x: path[0].x, y: path[0].y});
		}
		pointHeapOrigin = pointHeap.slice(0);
		var vecTMP = {x: 0, y: 0};
		var orderPoint = [];
		var t = 0;
		while (pointHeap.length > 0) {
			var convexHull = new graham();
			for (var i = 0; i < pointHeap.length; i++) {
				var point = pointHeap[i];
				convexHull.addPoint(point.x, point.y);
			}
			var hullPoints = convexHull.getHull();
			orderPoint.push(hullPoints);
			console.log(t++);
			for (var i = 0; i < hullPoints.length; i++) {
				for (var j = 0; j < pointHeap.length; j++) {
					if (hullPoints[i].x == pointHeap[j].x && hullPoints[i].y == pointHeap[j].y) {
						pointHeap.splice(j, 1);
						break;
					}
				}
			}
		}
		var paths = [];
		t = 0;
		for (var i = 0; i < orderPoint.length; i++) {
			for (var j = 0; j < orderPoint[i].length; j++) {
				var index;
				for (var k = 0; k < pointHeapOrigin.length; k++) {
					if (pointHeapOrigin[k].x == orderPoint[i][j].x && pointHeapOrigin[k].y == orderPoint[i][j].y) {
						index = k;
						break;
					}
				}
				t++;
				
				paths.push(_paths[index]);
			}
			
		}
		//getHull() returns the array of points that make up the convex hull.
		
	  	
		
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
	      	for (var segmentIdx=0, segmentLength = path.length; segmentIdx<segmentLength; segmentIdx++) {
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