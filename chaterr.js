/**

	The MIT License

	Copyright (c) 2011 Arunoda Susiripala

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.

 */
var apiKey = '486184408064731';
var secretKey = '042681525933472c91d1c6e57ea1219e';

var xmpp = require('./simple-xmpp');
var argv = process.argv;
var https = require('https');

var hostUrl = 'http://localhost:3000';

var express = require('express');
// if there are four arguments, they called
// node echo.js USER PASSWORD
// and we should let them use Google talk echoing
var GOOGLE = (argv.length == 4),
		SHOULD_ECHO = false,
		RANDO_CHANCE = 0,
		num_initial_randos = 0,
		// holds the pairs of conversation partners.
		PAIRS = {},
		INITIAL_MSGS = {},
		ONLINE = {},
		my_jid = argv[2];

var BLACKLIST = ['03kio453bg4lj1h1nz593suvkh@public.talk.google.com', //Les Vogel
								 '-627150145@chat.facebook.com', //Noah Tye
								 '-618057812@chat.facebook.com', //Eva
								 '-661897362@chat.facebook.com', //Lindsay
								 '-1043220377@chat.facebook.com', //Cassi
								 '-1293810335@chat.facebook.com', //SamYang
								 '-1389652921@chat.facebook.com' //SamB
								 ];

var MYLIST = ['appathybiz@gmail.com', 'pbooth@twitter.com', 'thepaulbooth@gmail.com'];

function getLoneliestPair(from) {
	 var keys = Object.keys(PAIRS);
	 console.log("Something weird")
	 console.log(PAIRS)
	 console.log(keys);
	 console.log("looking for loneliest person in " + JSON.stringify(PAIRS) + " keys:" + keys);
	 for (var i = 0; i < keys.length; i++) {
	 	console.log("checking " +i +"/" + keys.length + ":" + keys[i]);
	 	if (keys[i] != from && PAIRS[keys[i]] == null) {
	 		return keys[i]
	 	}
 	 }
 	 console.log("no lonely people");
 	 return null;
}


xmpp.on('online', function() {
	console.log('Yes, I\'m connected!');
	setTimeout(function(){
		var randos = [];
		for (var i = 0; i < num_initial_randos; i++) {
			var rando = getRando(randos);
			console.log("randos:" + randos);
			console.log("rando:" + rando);
			console.log("index:" + i);
			if (rando in randos) {
				i--;
			} else {
				randos.push(rando);
			}
		}

		for (var i = 0; i < randos.length; i++) {
			pingUser(randos[i]);
		}
	}, 500);
});

function pingUser(jid, message) {
	var first_messages = [
			'hi',
			'hey',
			'what\'s up?',
			'sup',
			'how was your day?',
			'what are you up to right now?',
			'how have you been?',
			'Ask me a good question!',
			'hey you :)'
		];
	if (!message) {
		message = first_messages[Math.floor(Math.random() * first_messages.length)];
		xmpp.send(jid, message);
		console.log ("Pinged '" + message + "' to " + jid);
	}
}


xmpp.on('chat', function(from, message) {
	console.log("#########################CHAT:" + message + " FROM:" + from);
	if (SHOULD_ECHO) {
		var echo_texts = ['why do you think that ',
									 		'how does it make you feel that ',
											'did you know that ',
											'I love this line:',
											'I don\'t understand ',
											'I don\'t get it when you say ',
											'What\'s better than ',
											'I couldn\'t agree more that ',
											'Could you explain more about ',
											'C\'mon, you really think ',
											'Why would I ',
											'Help me understand ',
											'You\'re a good friend. Thanks for saying ',
											'I can see how you could think ',
											'What are the downsides of '];
		xmpp.send(from, echo_texts[Math.floor ( Math.random() * echo_texts.length )] + message);
	} else {
		// time to pair people up.
		sendMessageToPartner(from, message);
	}
	xmpp.probe('thepaulbooth@gmail.com', function(state) {
		console.log(state == xmpp.STATUS.ONLINE);
	});
});

// xmpp.on('stanza', function(stanza) {
//   console.log("STANZA:" + stanza);
// });

function sendMessageToPartner(from, message) {

	var lonely = PAIRS[from];
	console.log("going to tell " + from + "'s partner (" + lonely + "): " + message);
	// check if need a partner
	if (lonely == null || lonely == undefined || PAIRS[lonely] == null || PAIRS[lonely] == undefined) {
		console.log(JSON.stringify(PAIRS));
		lonely = getLoneliestPair(from);
		console.log(lonely)
		PAIRS[from] = lonely;
		console.log("" + from + "'s new partner IS! The lonely " + lonely);
		if (lonely != null) {
			PAIRS[lonely] = from;
			if (INITIAL_MSGS[lonely]) {
				console.log("" + lonely + " has a waiting message for " + from + ". It's: " + INITIAL_MSGS[lonely]);
				sendMessageToPartner(lonely, INITIAL_MSGS[lonely]);
				delete INITIAL_MSGS[lonely];
			}
		} else {
			if (!INITIAL_MSGS[from] && Math.random() < RANDO_CHANCE) {
				console.log("" + from + " has no partner. Getting Rando.");
				var rando = getRando(from);
				console.log("rando:" + rando);
				if (rando) {
					PAIRS[from] = rando;
					PAIRS[rando] = from;
					lonely = rando;
				} else {
					console.error("Can't get rando. :(");
					INITIAL_MSGS[from] = message;
					return;
				}
			} else {
				if (INITIAL_MSGS[from]) {
					INITIAL_MSGS[from] += '\n' + message;
				} else {
					INITIAL_MSGS[from] = message;
				}
				console.log("" + from + " has no partner. Saving message:" + INITIAL_MSGS[from]);
				return;
			}
		}
	}

	// If it is a google jid, we can probe, otherwise (facebook) we can't probe, so assume online
	if (isGoogleUser(lonely)) {
		// see if partner online
		xmpp.probe(lonely, function(state) {
			console.log("Done probing " + lonely)
			console.log(state)
			if (state != xmpp.STATUS.OFFLINE) {
				xmpp.send(lonely, repersonalizeMessage(message, ONLINE[lonely]));
			} else {
				console.log("WELL, " + lonely + " is offline.");
				PAIRS[from] = null;
				delete PAIRS[lonely];
				// get a new partner and send THEM the message
				sendMessageToPartner(from, message);
			}
		});
	} else {
		console.log("sending " + lonely + " message: " + message);
		xmpp.send(lonely, repersonalizeMessage(message, ONLINE[lonely]));
	}
}

function repersonalizeMessage(message, to_user) {
	if (!to_user || !to_user.first_name || !to_user.last_name) {
		return message.replace(new RegExp(my_user.first_name, 'gi'), "friend").replace(new RegExp(my_user.last_name, 'gi'), "Mate");
	}
	return message.replace(new RegExp(my_user.first_name, 'gi'), to_user.first_name).replace(new RegExp(my_user.last_name, 'gi'), to_user.last_name);
}

function getRando(exclude) {
	var rando = null;
	if (typeof(exclude) != typeof([])) {
		exclude = [exclude];
	}
	while (rando == null || rando == my_jid || rando in BLACKLIST || rando in exclude ) {
		rando = ONLINE[Math.floor ( Math.random() * ONLINE.length )];
		if (rando in PAIRS && PAIRS[rando] in PAIRS) {
			console.log("rando " + rando + " is already in PAIRS with partner:" + PAIRS[rando]);
		}
	}
	return rando;
}

function isGoogleUser(jid) {
	return jid.indexOf("google.com") != -1 || jid.indexOf("gmail.com") != -1
}

//Only for Fb users
function addFbUserToOnline(jid) {
	var options = {
		  host: 'graph.facebook.com',
		  port: 443,
		  path: '/' + jid.replace("@chat.facebook.com", "").replace("-","") + '?access_token=' + access_token
		};
	https.get(options, function(fbres) {

		  var output = '';
    	fbres.on('data', function (chunk) {
    			//console.log("CHUNK:" + chunk);
          output += chunk;
      });

      fbres.on('end', function() {
      	try{
	        var user = JSON.parse(output);
	        console.log("Adding FB user " + jid + " to ONLINE:" + JSON.stringify(user));
	        ONLINE[jid] = user;
	      } catch(e) {
	      	console.log(e);
	      	console.log("BAD OUTPUT:");
	      	console.log(output);
	      }
			});
	});
}

function addSimpleJidToOnline(jid) {
	//console.log("Adding simple user to ONLINE:" + jid)
	ONLINE[jid] = {name: jid};
}

xmpp.on('error', function(err) {
	console.error(err);
});

xmpp.on('buddy', function(jid, state) {
	console.log("---------------%s is now '%s'", jid, state);
	if (state == xmpp.STATUS.ONLINE) {
		if (isGoogleUser(jid)) {
			addSimpleJidToOnline(jid);
		} else {
			// assume facebook
			addFbUserToOnline(jid);
		}
	} else {
		if (ONLINE[jid]) {
			delete ONLINE[jid];
		}
		if (PAIRS[jid]) {
			PAIRS[PAIRS[jid]] = null;
			PAIRS[jid] = null;
		}
	}
});

if (GOOGLE) {
	console.log("Google mode activated. Working, but look Go to " + hostUrl);
	// Google talk stuff
	// example call: node echo.js thephantompaulbooth@gmail.com MyPasswordIsN0tKittens
	xmpp.connect({
	    jid         : my_jid,
	    password    : argv[3],
	    host        : 'talk.google.com',
	    host        : 'talk.google.com',
	    port        : 5222
	});

} else {
	console.log("Facebook mode activated. Go to " + hostUrl);

	var access_token = null;
	var my_user = null;
	// xmpp.connect({
	// 	jid: '-WWW.FACEB0OK.C0M@chat.facebook.com', // where 123456 is the users facebook id
	// 	api_key: apiKey, // api key of your facebook app
	// 	secret_key: secretKey, // secret key of your facebook app
	// 	session_key: sessionKey // users current session key
	// });


	// The actual app and server
	var app = express.createServer();
	app.set('views', __dirname + '/views');
	app.use(express.static(__dirname + '/public'));

	app.get('/', function(req, res){
		var redirect_url = 'https://www.facebook.com/dialog/oauth?client_id=' + apiKey +
		 '&redirect_uri=' + hostUrl + '/perms' +
		 '&scope=xmpp_login&state=authed'
		 console.log("REDIRECTIN' From /")
		 console.log(redirect_url);
		 console.log("REQUEST HEADERS:" + JSON.stringify(req.headers));
	  res.redirect(redirect_url);
	});

	app.get('/perms', function(req, res){
		var state = req.query['state'];
		var code = req.query['code'];
		console.log("req.query:" + JSON.stringify(req.query))
		console.log("hit /perms")
		console.log("Code:");
		console.log(code);
		if (state == 'authed') {
			console.log('sick. PERMED.')
			var redirect_path = '/oauth/access_token?' +
	    'client_id=' + apiKey +
	    '&redirect_uri=' + hostUrl + '/perms' +
	    '&client_secret=' + secretKey +
	    '&code=' + code;// + '&destination=chat';
	    var redirect_url = 'https://graph.facebook.com' + redirect_path;
	    // var options = {
	    // 	host: 'graph.facebook.com',
		   //  port: 443,
		   //  path: redirect_path,
		   //  method: 'GET',
		   //  headers: {
		   //      'Content-Type': 'application/json'
		   //  }
	    // };
	    // var fbreq = https.request(options, function(fbres){
	    // 	console.log('FACEBOOK RESPONSE');
	    // 	console.log(fbres);
	    // 	var output = '';
	    // 	fbres.on('data', function (chunk) {
     //        output += chunk;
     //    });

     //    fbres.on('end', function() {
     //        var obj = JSON.parse(output);
     //        console.log("OUTPUT: ************");
     //        console.log(ouput);

     //    });
	    // })
	    console.log(redirect_url);
	    console.log('path:' + redirect_path);



	    // var facebook_client = https.createClient(80, "graph.facebook.com");
	    // var fbresponse = facebook_client.request('GET',redirect_path,{"host":"graph.facebook.com"});
	    // fbrequest.addListener("response", function(response) {
     //    var body = "";
     //    response.addListener("data", function(data) {
     //        body += data;
     //    });

     //    response.addListener("end", function() {
     //        var data = JSON.parse(body);
     //        console.log("HEHEHEHEHEHEHEY");
     //        console.log(data);
     //        //facebook_emitter.emit("data", String(data.likes));
     //    });
    // });
    // request.end();
			var options = {
			  host: 'graph.facebook.com',
			  port: 443,
			  path: redirect_path
			};

			https.get(options, function(fbres) {
			  console.log('STATUS: ' + fbres.statusCode);
			  console.log('HEADERS: ' + JSON.stringify(fbres.headers));
			  var output = '';
	    	fbres.on('data', function (chunk) {
	    			console.log("CHUNK:" + chunk);
            output += chunk;
        });

        fbres.on('end', function() {
          console.log("OUTPUT: ************");
          console.log(output);
          access_token = output.replace(/access_token=/,"").replace(/&expires=\d+$/, "");

          console.log("ACCESS TOKEN:" + access_token)
					xmpp.connect({
							jid: '-WWW.FACEB0OK.C0M@chat.facebook.com', // where 123456 is the users facebook id
							api_key: apiKey, // api key of your facebook app
							secret_key: secretKey, // secret key of your facebook app
							access_token: access_token, // users current session key
			        host: 'chat.facebook.com'
						});
					res.redirect('/basicinfo');
        });
			}).on('error', function(e) {
			  console.log('ERROR: ' + e.message);
			});
			//res.redirect(redirect_url);
			//res.send(redirect_url +'\nhttps://graph.facebook.com/oauth/access_token?client_id=YOUR_APP_ID&redirect_uri=YOUR_REDIRECT_URI&client_secret=YOUR_APP_SECRET&code=CODE_GENERATED_BY_FACEBOOK')
		}
	});

	app.get('/basicinfo', function(req, res) {
		if (!access_token) {
			console.log("NO ACCESS TOKEN AT CHAT.")
			res.redirect('/');
			return;
		}
		var options = {
			  host: 'graph.facebook.com',
			  port: 443,
			  path: '/me?access_token=' + access_token
			};
		https.get(options, function(fbres) {
			console.log('CHATSTATUS: ' + fbres.statusCode);
			  console.log('HEADERS: ' + JSON.stringify(fbres.headers));

			  var output = '';
	    	fbres.on('data', function (chunk) {
	    			//console.log("CHUNK:" + chunk);
            output += chunk;
        });

        fbres.on('end', function() {
          my_user = JSON.parse(output);
          res.redirect('/chat');
				});
		});
	});

	app.get('/chat', function(req, res) {
		if (!access_token) {
			console.log("NO ACCESS TOKEN AT CHAT.")
			res.redirect('/');
			return;
		} else {
			console.log ("ACCESS TOKEN AT CHAT:" + access_token);
		}
		var locals = {name: my_user.name,
									online: Object.keys(ONLINE).map(function(jid) { return {jid:jid, user:ONLINE[jid]} }).sort(function(user1, user2) {return (user1.user.name == user2.user.name) ? 0: (user1.user.name > user2.user.name ? 1 : -1)}),
									pairs: Object.keys(PAIRS).map(function(jid) { return [ {jid:jid, user:ONLINE[jid]}, {jid:jid, user:ONLINE[PAIRS[jid]]} ]  })   }
		console.log("locals:")
		console.log(JSON.stringify(locals, undefined, 2));
		console.log("online:");
		console.log(ONLINE);
		console.log("online as string:");
		console.log(JSON.stringify(ONLINE, undefined, 2));
		res.render('index.jade', locals);
		//res.send("CHATTING IT UP, " + my_user.name + ", with: <ul><li>" + ONLINE.join('</li><li>') + '</li></ul>');
	});

	app.get('/fbping', function(req, res) {
		var fbid = req.query['fbid'];
		var jid = '-' + fbid + '@chat.facebook.com';
		pingUser(jid);
		res.redirect('/chat');
	});

	app.get('/getdata', function(req, res) {
		// console.log("XXgetdata ************************");
		// console.log(JSON.stringify({online: ONLINE, pairs: PAIRS, my_user: my_user}));
		// console.log("online:")
		// console.log(ONLINE);
		// console.log("online stringified:")
		// console.log(JSON.stringify(ONLINE));
		// console.log( "XX/getdata ***************")
		res.send(JSON.stringify({online: ONLINE, pairs: PAIRS, my_user: my_user}));
	});

	app.post('/deletepair', function(req, res) {
		console.log("deletepair");
		console.log(req);
		console.log(req.query);
		console.log(req.query['pair']);
		var pair = req.query['pair'];
		for (var i = 0; i < pair.length; i++) {
			delete PAIRS[pair[i].jid];
		}
		res.send("OK");
	});

	app.listen(3000);
}
