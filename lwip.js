var Jimp = require("jimp"),
	phpjs= require('phpjs'),
	time = phpjs.microtime(true);
var lenna = new Jimp("./path3065.png", function (err, image) {
    // check 'err'. use 'image'.
	var width	= image.bitmap.width,
		height	= image.bitmap.height
		t		= 0,
		feedRate= 1000;
	var ok = function (j, t) {
		return (t == 0 && j < width) || (t == 1 && j >= 0);
	}
	var depth = function(color) {
		//if (color.a == 0) return 0;
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
	gcode = [
		'G90',	// Absolute coordinate mode. Oxyz
		'G21',	// Unit: mm
		'S0',	//set min power
		'G01 F' + phpjs.sprintf("%.1f", feedRate)
	];
	var _S = 0;
	//console.log(image.bitmap.data.length);
	//console.log(image.bitmap.data.length / 4 / width);
	//console.log(height);
	//console.log(width);
	/*image.scan(0, 0, width, height, function (x, y, idx) {
		// x, y is the position of this pixel on the image
		// idx is the position start position of this rgba tuple in the bitmap Buffer
		// this is the image
		
		var red = this.bitmap.data[idx];
		var green = this.bitmap.data[idx+1];
		var blue = this.bitmap.data[idx+2];
		var alpha = this.bitmap.data[idx+3];
		//console.log(x+ ' ' + y + ' ' + red + ' ' + green + ' ' + blue);
		// rgba values run from 0 - 255
		// e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
	});*/
	for (var i = 0; i < height; i++) {
		var start	= ( t == 0 ) ? 0 : width - 1;
		var plus	= (t == 0) ? 1 : -1;
		var cut		= false;
		var y		= (height - i) / 3.54328571429;
		var wasPlus = false;
		var _t		= t;
		for (var j = start; ok(j, _t) ; j += plus) {
			var x = j / 3.54328571429;
			var dep	= depth(getPixel(j, i));
			if (dep > 0) {
				if (!cut) {
					cut = true;
					if (!wasPlus) { 
						t = (t + 1) % 2;
						wasPlus = true;
					}
					gcode.push(phpjs.sprintf("G00 X%.5f Y%.5f", x, y));
					gcode.push("M03");
				}
				if (dep != _S) {
					_S = dep;
					gcode.push(phpjs.sprintf("S%d", _S));
					gcode.push(phpjs.sprintf("G01 X%.5f", x));
				}
			} else {
				if (cut) {
					_S = 0;
					cut = false;
					gcode.push("M05");
				}
			}			
		}
		if (cut)
			gcode.push("M05");
	}
	console.log(gcode.join("\n"));
	console.log(";Time ext: " + (phpjs.microtime(true) - time));
});
