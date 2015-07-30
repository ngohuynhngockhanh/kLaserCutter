#!/usr/bin/env node
//require
var	express		=	require('express'),
	siofu 		= 	require("socketio-file-upload")
	app        	= 	express(),
	fs         	= 	require('fs'),
	server		=	require('http').createServer(app),
    io			=	require('socket.io').listen(server),
	argv		=	require('optimist').argv,
	phpjs		= 	require('phpjs'),
	Infinity	=	1e90,
	exec 		=	require('child_process').exec,
	svg2gcode	=	require('./lib/svg2gcode'),
	serialport	=	require("serialport"),
	SerialPort	= 	serialport.SerialPort;
	

var	gcodeQueue	= 	[],
	timer1		=	phpjs.time(),
	machineRunning=	false,
	okWaitTime	=	10,				//10s
	intervalTime	=	argv.waitTime || 1500;	//1s




//main program

////read stdin data
var svg = ""; // svg's data
process.stdin.on('data', function(char) {
	svg += char;
});

////start process svg data
process.stdin.on('end', function() {
	console.log(svg2gcode.svg2gcode(svg, argv));
});

//// end process data
process.stdin.resume();


/*


// Thư mục chứa ảnh upload trên server
app.use('/pictures', express.static(__dirname + '/upload'));

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/index.html');
});


io.sockets.on('connection', function (socket) {
	var uploader = new siofu();
    uploader.dir = "./upload";
    uploader.listen(socket);
	 // Do something when a file is saved:
    uploader.on("saved", function(event){
        var file = event.file;
		var filepath = file.pathName;
		var content = fs.readFileSync('./' + filepath).toString();
		content = svg2gcode.svg2gcode(content, argv);
		addQueue(content);
    });
	// Error handler:
    uploader.on("error", function(event){
        console.log("Error from uploader", event);
    });
	socket.on('message',function(data){
  		console.log();
	});
});

server.listen(90);
siofu.listen(server);
console.log('Server runing port 90');

function sendFirstGCodeLine() {
	if (gcodeQueue.length == 0)
		return false;
	var command = gcodeQueue.shift();
	serialPort.write(command + "\r");
	io.sockets.emit("GCODE", {command: command, length: gcodeQueue.length});
	if (gcodeQueue.length == 0)
		machineRunning = false;
	return true;
}

function sendGcodeFromQueue() {
	sendFirstGCodeLine();
}

function receiveData(data) {
	if (data.indexOf('<') == 0) {	//type <status,...>
		data = phpjs.str_replace(['<', '>', 'WPos', 'MPos', ':', "\r", "\n"], '', data);
		var data_array = phpjs.explode(',', data);
		
		io.sockets.emit('position', data_array);
		
	} else if (data.indexOf('ok') == 0) {
		timer1 = phpjs.time();
		sendGcodeFromQueue();
	}
		
}

function addQueue(list) {
	if (phpjs.is_string(list)) {
		if (list.indexOf("\r") > -1) {
			list = phpjs.str_replace("\n", '', list);
			list = phpjs.explode("\r", list);
		} else
			list = phpjs.explode("\n", list);
	}
	gcodeQueue = list;
}

serialPort.on("open", function (error) {
	if (error) {
		console.log(error);
		io.sockets.emit("error", {id: 0, message: "Can't open Serial port", error: error});
	} else {
		console.log('open serial port');
		var interval = setInterval(function() {
			serialPort.write("?\r", function (e) {
				if (e != undefined)
					io.sockets.emit('error');
			});
		}, intervalTime);
		serialPort.on('data', function(data) {
			 receiveData(data);
		});
	}
});

var AT_interval = setInterval(function() {
	serialPort.write("?\r");
	if (machineRunning && phpjs.time() - timer1 > okWaitTime) 
		io.socket.emit("error", {id: 0, message: 'Long time to wait ok response'});
}, intervalTime);*/
