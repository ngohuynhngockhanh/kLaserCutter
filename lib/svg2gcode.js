const 	unitConst = {
			'mm': 	1,
			'in':   25.4000008381,
			'pt':   0.35277777517,
			'm' :   1000,
			'cm':   10,
			'ft':   304.799827588,
			'pc':   4.23333093872,
			'px':   0.28222222222
			
		},
		defaultGCode = [
			'G90',	// Absolute coordinate mode. Oxyz
			'G21',	// Unit: mm
			'G17 G94 G54',
			'S1000',	//set max power
		];
var SVGReader	=	require('./SVGReader'),
	phpjs		=	require('phpjs');

module.exports = {
	svg2gcode : function(svg, settings) {
		// clean off any preceding whitespace
		svg = svg.replace(/^[\n\r \t]/gm, '');
		settings = settings || {};
		settings.scale = settings.scale || unitConst.px;	// slace
		settings.feedRate = settings.feedRate || 1400;	//engraving speed
	    settings.feedRate = phpjs.sprintf("%.1f", phpjs.floatval(settings.feedRate));
		var
			scale=function(val) {
	    		return val * settings.scale
	  		},
			SVGDom = require('domino').createWindow(svg).document,
	  		gcode,
	  		path,	  		
			svgSelector = SVGDom.querySelector('svg'),
			pageHeight,
			originPageHeight,
			pageWidth;
		if (svgSelector) {
			pageHeight = svgSelector.getAttribute("height");	//pageHeight for adjust Y coordinate
			originPageHeight = pageHeight
			pageWidth = svgSelector.getAttribute("width")
		}
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
		
		var convertConst = unitConst[unit] / unitConst.px;
		var vbX = 1, vbY = 1;
		if (svgSelector) {
			var viewBox = svgSelector.getAttribute("viewBox");
			viewBox = phpjs.explode(" ", viewBox);
			for (var i = 0; i < viewBox.length; i++)
				viewBox[i] = phpjs.floatval(viewBox[i]);
			vbX = phpjs.floatval(pageWidth) * convertConst / viewBox[2];
			vbY = phpjs.floatval(originPageHeight) * convertConst / viewBox[3];
		}
		//get all paths
		var paths = SVGReader.parse(svg, {vbX: vbX, vbY: vbY}).allcolors;
		
		if (paths.length > 0) {
			paths.sort(function(a, b) {
				return a[0].x - b[0].x;
			});
			paths.sort(function(a, b) {
				return b[0].y - a[0].y;
			});
			
			for (var i = 1; i < paths.length; i++) {
				var t = i;
				for (var j = t + 1; j < paths.length; j++) 
					if (paths[i - 1][0].distance(paths[j][0]) < paths[i - 1][0].distance(paths[t][0]))
						t = j;
				
				var tmp = paths[i];
				paths[i] = paths[t];
				paths[t] = tmp;
			}
		}
		
		
		
	  	gcode = defaultGCode.slice(0);
		gcode.push(phpjs.sprintf("G01 F%.1f", settings.feedRate));
		var prevX = 0;
		var prevY = 0;
	  	for (var pathIdx = 0, pathLength = paths.length; pathIdx < pathLength; pathIdx++) {
	    	path = paths[pathIdx];
	    	// seek to index 0
			prevX = phpjs.round(scale(path[0].x), 5);
			prevY = phpjs.round((scale(-path[0].y) + pageHeight), 5);
	    	gcode.push(['G00',
	      		'X' + prevX,
	      		'Y' + prevY,
	    	].join(' '));
			
	    
	
	      	// begin the cut by dropping the tool to the work
	      	gcode.push('M03');
			gcode.push("G01");
	      	// keep track of the current path being cut, as we may need to reverse it
	      	var localPath = [];
	      	for (var segmentIdx=0, segmentLength = path.length; segmentIdx<segmentLength; segmentIdx++) {
	        	var segment = path[segmentIdx];
				var nowX = phpjs.round(scale(segment.x), 5);
				var nowY = phpjs.round((scale(-segment.y) + pageHeight), 5);
				var localSegment = [];
				if (nowX != prevX) {
					localSegment.push("X" + nowX);
					prevX = nowX;
				}
				if (nowY != prevY) {
					localSegment.push("Y" + nowY);
					prevY = nowY;
				}
	
		        // feed through the material
		        if (localSegment.length > 0)
					gcode.push(localSegment.join(' '));
		
	        }
	        
	    	// turn off the laser
	    	gcode.push('M05');
	  	}
	
	
		// go home
		gcode.push('G00 X0 Y0 ');
	
		return gcode.join("\r\n");
	}
};