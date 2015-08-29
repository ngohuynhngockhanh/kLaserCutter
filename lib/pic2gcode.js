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


module.exports = {
	pic2gcode: function(image, options, callback) {
		//options
		options = options || {};
		options.feedRate	= options.feedRate 		|| 1000;
		options.resolution	= options.resolution	|| px2mm;
		var time = phpjs.microtime(true);
		
		//scale
		var scale = options.resolution / px2mm;
		if (phpjs.abs(scale - 1) > eps)
			image = image.scale(scale);
		
		
		//get width, height
		var width	= image.bitmap.width,
			height	= image.bitmap.height
			t		= 0;	//check how we cut
			
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
		//for by height
		for (var i = 0; i < height; i++) {
			var start	= (t == 0) ? 0 : width - 1,
				plus	= (t == 0) ? 1 : -1,
				cut		= false,
				y		= (height - i) / options.resolution, //real y
				wasPlus = false,
				_t		= t;
			//for by width
			if (callback) {
				callback(i, height);
			}
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
						gcode.push(phpjs.sprintf("G00 X%.5f Y%.5f", x, y));
						gcode.push("M03");
						gcode.push("G01");
					}
					if (dep != _S) {
						_S = dep;
						//change power
						gcode.push(phpjs.sprintf("S%d", _S));
						gcode.push(phpjs.sprintf("X%.5f", x));
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
		}
		//go to zero
		gcode.push("G0X0Y0");
		console.log(";Time ext: " + (phpjs.microtime(true) - time));
		
		
		return gcode; //return gcode list
	}
}