const	px2mm	= 3.54328571429,
		eps		= 1e-3,
		defaultGCode = [
			'G90',	// Absolute coordinate mode. Oxyz
			'G21',	// Unit: mm
			'G17 G94 G54',
			'S0',	//set min power
		];
var Jimp = require("jimp"),
	phpjs= require('phpjs');

var pic2gcodeProcess;
module.exports = {
	clear		: function () {
		if (pic2gcodeProcess)
			clearTimeout(pic2gcodeProcess);
	},
	pic2gcode	: function(image, options, callback) {
		//options
		options = options || {};
		options.feedRate	= options.feedRate 		|| 1000;
		options.resolution	= options.resolution	|| px2mm;
		options.maxCoorX	= options.maxCoorX		|| 320;
		options.maxCoorX	*= px2mm;
		options.maxCoorY	= options.maxCoorY		|| 315;
		options.maxCoorY	*= px2mm;
		callback			= callback || {};
		callback.percent	= callback.percent		|| null;
		callback.complete	= callback.complete		|| function () {
			console.log("'pic to gcode' was complete");
		};
		callback.error		= callback.error		|| function (message) {
			console.log(message);
		}
		var time = phpjs.microtime(true);
		var width	= image.bitmap.width,
			height	= image.bitmap.height,
			t = _t	= 0;	//check how we cut
		//scale
		console.log(width)
		console.log(height)
		var scale = options.resolution / px2mm;
		if (width > options.maxCoorX || height > options.maxCoorY) {
			if (callback.error)
				callback.error(phpjs.sprintf('Only accept size less than %d x %d (px x px)', options.maxCoorX, options.maxCoorY));
			return false;		
		}
		console.log(scale);
		if (phpjs.abs(scale - 1) > eps)
			image = image.scale(scale);
		
		
		//get width, height
		width	= image.bitmap.width;
		height	= image.bitmap.height;
		console.log(width);
		console.log(height);
		//function check "for by width"
		var ok = function (j, t) {
			return (t == 0 && j < width) || (t == 1 && j >= 0);
		}
		var depth = function(color) {
			return (765 - color.r - color.g - color.b) * color.a / 191.25;
		}
		var getPixel = function(x, y) {
			var idx = (y * width + x) << 2;
			var color = {
				r: image.bitmap.data[idx],
				g: image.bitmap.data[idx + 1],
				b: image.bitmap.data[idx + 2],
				a: image.bitmap.data[idx + 3]
			};
			return color;
		}
			
		
		//default gcoe
		var gcode = defaultGCode.slice(0);
		gcode.push(phpjs.sprintf("G01 F%.1f", options.feedRate));
		var _S = 0;
		var colorByCol = function(i) {
			var _ok = ok(j, _t),
				start	= (t == 0) ? 0 : width - 1,
				plus	= (t == 0) ? 1 : -1,
				y		= (height - i) / options.resolution, //real y
				wasPlus = false,
				_t		= t,
				cut 	= false;
			if (callback.percent)
				callback.percent(i / height * 100);
			
			for (var j = start; ok(j, _t) ; j += plus) {
				var x = j / options.resolution, //real x
					dep	= depth(getPixel(j, i));
					
				if (dep > 0) {
					if (!cut) {
						cut = true;
						if (!wasPlus) { 
							t = (t + 1) % 2;
							wasPlus = true;
						}
						//start cutting
						gcode.push(phpjs.sprintf("G00 X%.3f Y%.3f Z0.00001", x, y));
						gcode.push("M03");
						gcode.push("G01");
					}
					if (dep != _S) {
						_S = dep;
						//change power
						gcode.push(phpjs.sprintf("S%d", _S));
						gcode.push(phpjs.sprintf("X%.3f", x));
					}
				} else {
					if (cut) {
						//stop cutting
						_S = 0;
						cut = false;
						gcode.push("M05");
					}
				}	
			}
			if (cut)
				gcode.push("M05"); //make sure the laser is off
			i++;
			if (i == height) {
				gcode.push("G0X0Y0");
				console.log(";Time ext: " + (phpjs.microtime(true) - time));
				if (callback.complete)
					callback.complete(gcode);
				return;
			} else {			
				pic2gcodeProcess = setTimeout(function() {
					colorByCol(i);
				}, 0);
			}	
		}
		colorByCol(0);
		return true;
	}
}