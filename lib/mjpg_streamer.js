var 	phpjs		=		require('phpjs'),
		fs			=		require('fs'),
		sh 			= 		require('execSync');
		
		
function MJPG_Streamer(device, options) {
	device = device || sh.exec("ls /dev/video*").stdout;		
	options = options || {};
	options.resolution	= options.resolution	|| '240x120';
	options.fps			= options.fps 			|| '10';
	options.quality		= options.quality		|| '50';
	options.port 		= options.port			|| '8080';
	options.format		= options.format		|| 'auto';
	this.options = options;
	this.device = (phpjs.is_numeric(device)) ? '/dev/video' + phpjs.strval(device) : phpjs.trim(device);
	this.formatName = 'auto';
	console.log("init webcam at device video0");
}

MJPG_Streamer.prototype = {
    constructor: MJPG_Streamer,
	getOptions: function() {
		return this.options;
	},
	setOption: function(key, value) {
		this.options[key] = value;
	},
	setOptions: function(options) {
		for (var key in options)
			this.setOption(key, options[key]);
	},
	getSizeList: function() {
		return sh.exec('v4l2-ctl --list-formats-ext --device ' + this.device + ' | grep Size | awk {\'print $3\'}').stdout;
	},
	isAvailable: function() {
		return fs.existsSync(this.device);		
	},
	isMjpgRunning: function() {
		command = "ps | grep mjpg_streame";
		var result = sh.exec(command);
		return phpjs.strpos(result.stdout, 'mjpg_streamer') !== false;
	},
	shutdown: function() {
		sh.exec('kill $(ps | grep -v grep |grep mjpg | grep -v sh | awk \'{print $1}\')');
	},
	tryRun: function() {
		if (this.isAvailable()) {
			if (!this.isMjpgRunning()) {
				var format = '', command, result, quality = '',
					tmpfile = __dirname + '/../upload/mjpg_streamer.tmp';
				sh.run('echo "123" > ' + tmpfile);
				if (this.options.format == 'auto') {
					command = 'v4l2-ctl --list-formats --device ' + this.device;
					result = sh.exec(command);
					if (result.stdout.indexOf('MJPEG') == -1)
						format = '-y';
				} else
					format = (this.options.format == 'yuyv') ? '-y' : '';
				if (format == '-y')
					quality = ' -quality ' + this.options.quality;
				
				this.formatName = (format == '-y') ? "YUVU" : "MJPEG";
				
				if (this.formatName == 'YUVU' && this.options.resolution == '640x480')
					this.options.resolution = '320x240';
				
				command = 'cd '+ __dirname + '/../bin/mjpg_streamer && ./mjpg_streamer -i "./input_uvc.so ' + format + ' -d ' + this.device + ' ' + quality + ' -f ' + this.options.fps + ' -r ' + this.options.resolution + '" -o "./output_http.so -w ./www" > ' + tmpfile + ' 2>&1 &';
				result = sh.exec(command);
				sh.exec("sleep 0.05"); //wait 50ms to get tmpfile content
				result = fs.readFileSync(tmpfile).toString();
				
				if (phpjs.strpos(result, 'Unable to start capture: Input/output error') !== false) {
					return {
						ok: false,
						message: 'CHECK YOUR CAMERA CONNECTED. Error #1',
					}
				}
				return {
					ok: true,
					message: 'MJPG STREAMER IS RUNNING',
					port:	this.options.port,
					type: this.formatName,
					startAgain: true
				}
			} else 
				return {
					ok: true,
					message: 'MJPG STREAMER IS RUNNING',
					port:	this.options.port,
					type: this.formatName
				}
		} else 
			return {
				ok: false,
				message: 'NO USB DECTECTED'
			};
	}
};

module.exports = MJPG_Streamer;