var express = require('express'),
		app = express(),
		http = require('http'),
		server = http.createServer(app),
		io = require('socket.io').listen(server),
		cookie = require("cookie"),
		connect = require("connect");
		if (typeof localStorage === "undefined" || localStorage === null) {
 				 var LocalStorage = require('node-localstorage').LocalStorage;
  				 localStorage = new LocalStorage('./scratch');
		}
		


//set session middleware

app.configure(function () {
    app.use(express.cookieParser());
	app.use(express.bodyParser());
    app.use(express.session({secret: 'secret', key: 'express.sid'}));
	app.use(express.static(__dirname + '/public'));
	//to render static html files 
	app.set('views', __dirname + '/public');
	app.engine('html', require('ejs').renderFile);
	
});

// Asynchronous
/*var authAc = express.basicAuth(function(user, pass, callback) {
 var result = (user === 'testAc' && pass === 'testAc');
 callback(null, result);
});

var authUser = express.basicAuth(function(user, pass, callback) {
 var result = (user === 'testUser' && pass === 'testUser');
 callback(null, result);
});*/

//define your routes here 

app.get('/ac', function(req, res){
	if(req.session.user){
		res.render('deckjs/introduction/index.html');
	}else{
		res.render('deckjs/introduction/indexac.html');
	}	
});

app.get('/', function(req, res){
	res.redirect('/ac');
});

app.get('/user', function(req, res){
	//var mode = req.query.mode;
	res.render('deckjs/introduction/userlogin.html',{
				'mode':'user'
		});
	
});

app.post('/user', function(req, res){
	(req.body.mode=='user')?req.session.user=req.body.uname:'';
	if(req.session.user != ''){
		localStorage.setItem("userId" , req.session.user);
		console.log("localstorage get "+localStorage.getItem("userId"));
		res.redirect('/ac');
	}else{
		console.log("user not logged-in");
	}
	
});
//socket authorization

io.set('authorization', function (handshakeData, accept) {

  if (handshakeData.headers.cookie) {

    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);

    handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['express.sid'], 'secret');

    if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
      return accept('Cookie is invalid.', false);
    }

  } else {
    return accept('No cookie transmitted.', false);
  } 

  accept(null, true);
});

var clients = [];
var currentSection = -1;
io.sockets.on('connection', function(socket){
	

	 socket.on('user connected', function(data){
		socket.user=true;
		clients.push(localStorage.getItem("userId"));
		socket.broadcast.emit('user connected', clients);
	});
	
	 socket.on('ac connected', function(data){
		console.log('ac connected');
		
	    io.sockets.emit('user connected', clients);
		io.sockets.emit('section update', {section:currentSection});
	
		
	});
	
	socket.on('message', function(message){
		socket.broadcast.emit('message', message);
	});

	socket.on('key down', function(data){
		socket.broadcast.emit('key down', data);
	});

	socket.on('key up', function(data){
		socket.broadcast.emit('key up', data);
	});

	socket.on('flowtime minimap complete', function(data){
		socket.broadcast.emit('flowtime minimap complete', data);
	});

	socket.on('navigate', function(data){
		socket.broadcast.emit('navigate', data);
	});
	
	socket.on('section update', function(data){
		currentSection = data.section;
		socket.broadcast.emit('section update', data);
	});
	socket.on('im', function(data){
		console.log('im recieved')
		if(socket.user){
			data.message=localStorage.getItem('userId')+': '+data.message;
		}
		socket.broadcast.emit('im', data);
	});
	
	socket.on('disconnect', function(data){
		console.log("Connection " + socket.id + " terminated.");
		if(socket.user){
		console.log('No user connected')
			clients.splice(clients.indexOf('user'),1);
			currentSection = -1;
			io.sockets.emit('section update', {section:currentSection});
			socket.broadcast.emit('user connected', clients);
		}
	
	});
	

});
 
server.listen(3000);
console.log("Listening on http://localhost:3000/");