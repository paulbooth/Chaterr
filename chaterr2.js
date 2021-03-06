
var access_token = null; // For Facebook
var my_user = null; // The current Facebook user, so we don't request a bunch

var xmpp = require('./simple-xmpp');
var argv = process.argv;
var https = require('https');
var childProcess = require('child_process'); // to call external programs



var express = require('express');
// if there are four arguments, they called
// node echo.js USER PASSWORD
// and we should let them use Google chat
var RANDO_CHANCE = 0.5, // Chance of getting a rando pulled in when a new person pings in
    LOCALMODE = false, // running localhost or thepaulbooth.com
    RANDO_PINGING = false,
    RANDO_PING_TIME = 60 * 60 * 1000,
    RANDO_PING_NUM = 6,
    num_initial_randos = 6,
    CLEVERBOT = false,
    CLEVERBOT_PING = false,
    // holds the pairs of conversation partners.
    PAIRS = {},
    INITIAL_MSGS = {},
    ONLINE = {},
    my_jid = argv[2];

// for the public
var hostUrl = 'http://thepaulbooth.com:3010';
var apiKey = '486184408064731';
var secretKey = '76eeb7260c706fcd7f57ee3172560ff4';

if (LOCALMODE) {
  hostUrl = 'http://localhost:3000';
  apiKey = '101549946670437';
  secretKey = 'a0fc3798d2eac40cfd52bd2124448868';
}

var BLACKLIST = ['03kio453bg4lj1h1nz593suvkh@public.talk.google.com', //Les Vogel
                 '-627150145@chat.facebook.com', //Noah Tye
                 '-618057812@chat.facebook.com', //Eva
                 '-661897362@chat.facebook.com', //Lindsay
                 '-1043220377@chat.facebook.com', //Cassi
                 '-1293810335@chat.facebook.com', //SamYang
                 '-1389652921@chat.facebook.com', //SamB
                 '-205109@chat.facebook.com' //Peter Deng

                 ];

// general purpose getrandomproperty function
function getRandomProperty(obj) {
    var result;
    var count = 0;
    for (var prop in obj)
        if (Math.random() < 1/++count)
           result = prop;
    return result;
}

// pings a certain number of randos
function pingSomeRandos(num_randos) {
  if (ONLINE.length < num_randos) {
    num_randos = ONLINE.length;
  }
  console.log("PINGING " + num_randos + " RANDOS");
  var randos = [];
  for (var i = 0; i < num_randos; i++) {
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
}

xmpp.on('online', function() {
  console.log('Yes, I\'m connected!');
  // put in a timeout to make sure that there are people online
  setTimeout(function(){
    pingSomeRandos(num_initial_randos);

    // set up the rando pinging at certain times, after waiting for people to appear online
    if (RANDO_PINGING && RANDO_PING_TIME > 0 && RANDO_PING_NUM > 0) {
      setInterval(function() {
        pingSomeRandos(RANDO_PING_NUM);
      }, RANDO_PING_TIME);
    }

  }, 1000);
});

xmpp.on('chat', function(from, message) {
  console.log("#########################CHAT:" + message + " FROM:" + from + " (" + getName(from) + ")");
  // time to pair people up.
  if (CLEVERBOT) {
    sendMessageToCleverBot(from, message);
  } else {
    sendMessageToPartner(from, message);
  }
});

// xmpp.on('stanza', function(stanza) {
//   console.log("STANZA:" + stanza);
// });

xmpp.on('error', function(err) {
  console.log("XMPP ERROROROROROR");
  console.error(err);
});

xmpp.on('buddy', function(jid, state) {
  if (state == xmpp.STATUS.ONLINE) {
    console.log("---------------%s is now '%s'", jid, state);
    // assume facebook
    addUserToOnline(jid);
  } else {
    console.log("---------------%s (%s) is now '%s'", jid, getName(jid), state);
    removeUserFromOnline(jid);
  }
  
});


function getLoneliestPair(from) {
   var keys = Object.keys(PAIRS);
   // console.log("Something weird")
   // console.log(PAIRS)
   // console.log(keys);
   // console.log("looking for loneliest person in " + JSON.stringify(PAIRS) + " keys:" + keys);
   for (var i = 0; i < keys.length; i++) {
    console.log("checking " +i +"/" + keys.length + ":" + keys[i]);
    if (keys[i] != from && PAIRS[keys[i]] == null) {
      return keys[i]
    }
   }
   // console.log("no lonely people");
   return null;
}

function pingUser(jid, message) {
  var first_messages = [
      'I feel like we haven\'t talked in a while.\nWhat\'s up with you these days?',
      'hey',
      'what\'s up?',
      'sup',
      'how was your day?',
      'hey there',
      'yo',
      ':like:',
      'how have you been?',
      'hey you :D',
      'I\'m bored. Let\'s talk!'
    ];
  if (!message) {
    var lonelyman = getLoneliestPair(null);
    if (lonelyman && INITIAL_MSGS[lonelyman]) {
      message = INITIAL_MSGS[lonelyman];
      message = repersonalizeMessage(ONLINE[lonelyman], message, ONLINE[jid])
      delete INITIAL_MSGS[lonelyman];
    } else {
      message = first_messages[Math.floor(Math.random() * first_messages.length) ];
    }
  }
  if (CLEVERBOT_PING) {
    pingUserWithCleverBot(jid, message);
  } else {
    xmpp.send(jid, message);
    console.log ("Pinged '" + message + "' to " + jid + "(" + getName(jid) + ")");
  }
}

function pingUserWithCleverBot(jid, message) {
  console.log('sending ping message to cleverbot:' + message);
  var cleverbot = childProcess.exec('python cleverbot.py "' + message + '"', function (error, stdout, stderr) {
   // if (error) {
   //   console.log(error.stack);
   //   console.log('Error code: '+error.code);
   //   console.log('Signal received: '+error.signal);
   // }
   // console.log('Child Process STDOUT: '+stdout);
   // console.log('Child Process STDERR: '+stderr);
   console.log('CLEVERBOTOUT: ' + stdout);
   console.log('CLEVERERROR: ' + stderr);
   xmpp.send(jid, stdout);
   console.log ("Pinged '" + stdout + "' to " + jid);
  });
}

// gets the name associated with a jid, or nothing
function getName(jid) {
  if (jid && ONLINE[jid] && ONLINE[jid].name) {
    return ONLINE[jid].name;
  }
  return "?";
}

function sendMessageToPartner(from, message) {
  var lonely = PAIRS[from];
  console.log("going to tell " + from + "(" + getName(from) + ")'s partner " + lonely + "(" + getName(lonely) + "): " + message);
  // check if need a partner
  if (lonely == null || lonely == undefined) {
    console.log(JSON.stringify(PAIRS, undefined, 2));
    lonely = getLoneliestPair(from);
    PAIRS[from] = lonely;
    console.log("" + from + "(" + getName(from) + ")'s new partner IS! The lonely " + lonely + "(" + getName(lonely) + ")");
    if (lonely != null) {
      PAIRS[lonely] = from;
      if (INITIAL_MSGS[lonely]) {
        console.log("" + lonely + "(" + getName(lonely) + ") has a waiting message for " + from + "(" + getName(from) + "). It's: " + INITIAL_MSGS[lonely]);
        sendMessageToPartner(lonely, INITIAL_MSGS[lonely]);
        delete INITIAL_MSGS[lonely];
      }
    } else {
      if (!INITIAL_MSGS[from] && Math.random() < RANDO_CHANCE) {
        console.log("" + from + "(" + getName(from) + ") has no partner. Getting Rando.");
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
        console.log("" + from + "(" + getName(from) + ") has no partner. Saving message:" + INITIAL_MSGS[from]);
        return;
      }
    }
  }
  console.log("sending " + lonely + "(" + getName(lonely) + ") message: " + message);
  xmpp.send(lonely, repersonalizeMessage(ONLINE[from], message, ONLINE[lonely]));
}

function sendMessageToCleverBot(from, message) {
  console.log('sending message to cleverbot:' + message);
  var cleverbot = childProcess.exec('python cleverbot.py "' + message + '"', function (error, stdout, stderr) {
   // if (error) {
   //   console.log(error.stack);
   //   console.log('Error code: '+error.code);
   //   console.log('Signal received: '+error.signal);
   // }
   // console.log('Child Process STDOUT: '+stdout);
   // console.log('Child Process STDERR: '+stderr);
   console.log('CLEVERBOT: ' + stdout);
   console.log('CLEVERERROR: ' + stderr);
   xmpp.send(from, stdout);
  });
}

function repersonalizeMessage(from_user, msg, to_user) {
  var first_name_secret = "<MYFIRSTNAME>",
      last_name_secret = "<MYLASTNAME>"
  var message = msg.replace(new RegExp(my_user.first_name, 'gi'), first_name_secret).replace(new RegExp(my_user.last_name, 'gi'), last_name_secret);

  if (from_user && from_user.first_name && from_user.last_name) {
    if (!my_user || !my_user.first_name || !my_user.last_name) {
      message = message.replace(new RegExp(from_user.first_name, 'gi'), "I").replace(new RegExp(from_user.last_name, 'gi'), "myself");
    } else {
      message = message.replace(new RegExp(from_user.first_name, 'gi'), my_user.first_name).replace(new RegExp(from_user.last_name, 'gi'), my_user.last_name);
      if (message.split(/[\s.]/).join("").toUpperCase() == ("" + from_user.first_name[0] + from_user.last_name[0]).toUpperCase()) {
        return "" + my_user.first_name[0] + my_user.last_name[0]
      }
    }
  }

  if (!to_user || !to_user.first_name || !to_user.last_name) {
    message = message.replace(new RegExp(first_name_secret, 'gi'), "friend").replace(new RegExp(last_name_secret, 'gi'), "Mate");
  } else {
    message = message.replace(new RegExp(first_name_secret, 'gi'), to_user.first_name).replace(new RegExp(last_name_secret, 'gi'), to_user.last_name);
    if (message.split(/[\s.]/).join("").toUpperCase() == ("" + my_user.first_name[0] + my_user.last_name[0]).toUpperCase()) {
      return "" + to_user.first_name[0] + to_user.last_name[0]
    }
  }
  return message;
}

function getRando(exclude) {
  var rando = null;
  if (typeof(exclude) != typeof([])) {
    exclude = [exclude];
  }
  console.log("entering while loop");
  while (rando == null || rando == my_jid || rando in BLACKLIST || rando in exclude ) {
    rando = getRandomProperty(ONLINE);
    console.log("trying rando: " + rando + "(" + getName(rando) + ")");
    if (rando in PAIRS && PAIRS[rando] in PAIRS) {
      console.log("rando " + rando + "(" + getName(rando) + ") is already in PAIRS with partner:" + PAIRS[rando] + "(" + getName(PAIRS[rando]) + ")");
      rando = null;
    }
  }
  return rando;
}

function addUserToOnline(jid) {
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
          // console.log("Adding FB user " + jid + " to ONLINE:" + JSON.stringify(user));
          ONLINE[jid] = user;
        } catch(e) {
          console.log(e);
          console.log("BAD OUTPUT:");
          console.log(output);
        }
      });
  });
}

function removeUserFromOnline(jid) {
  if (ONLINE[jid]) {
    delete ONLINE[jid];
  }

  if (PAIRS[jid]) {
    PAIRS[PAIRS[jid]] = null;
  }
  delete PAIRS[jid];
}

function startXmppServer() {
  xmpp.connect({
    jid: '-WWW.FACEB0OK.C0M@chat.facebook.com', // where 123456 is the users facebook id
    api_key: apiKey, // api key of your facebook app
    secret_key: secretKey, // secret key of your facebook app
    access_token: access_token, // users current session key
    host: 'chat.facebook.com'
  });
}

console.log("Facebook mode activated. Go to " + hostUrl);
// The actual app and server
var app = express();
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

// First part of Facebook auth dance
app.get('/', function(req, res){
  var redirect_url = 'https://www.facebook.com/dialog/oauth?client_id=' + apiKey +
   '&redirect_uri=' + hostUrl + '/perms' +
   '&scope=xmpp_login&state=authed'
   console.log("REDIRECTIN' From /")
   console.log(redirect_url);
   console.log("REQUEST HEADERS:" + JSON.stringify(req.headers));
  res.redirect(redirect_url);
});

// Second part of Facebook auth dance
app.get('/perms', function(req, res){
  var state = req.query['state'];
  var code = req.query['code'];
  // console.log("req.query:" + JSON.stringify(req.query))
  // console.log("hit /perms")
  // console.log("Code:");
  // console.log(code);
  if (state == 'authed') {
    console.log('sick. Facebook PERMED us.')
    var redirect_path = '/oauth/access_token?' +
    'client_id=' + apiKey +
    '&redirect_uri=' + hostUrl + '/perms' +
    '&client_secret=' + secretKey +
    '&code=' + code;// + '&destination=chat';
    var options = {
      host: 'graph.facebook.com',
      port: 443,
      path: redirect_path
    };

    https.get(options, function(fbres) {
      // console.log('STATUS: ' + fbres.statusCode);
      // console.log('HEADERS: ' + JSON.stringify(fbres.headers));
      var output = '';
      fbres.on('data', function (chunk) {
          output += chunk;
      });

      fbres.on('end', function() {
        // parse the text to get the access token
        access_token = output.replace(/access_token=/,"").replace(/&expires=\d+$/, "");

        // console.log("ACCESS TOKEN:" + access_token)
        startXmppServer();
        res.redirect('/basicinfo');
      });
    }).on('error', function(e) {
      console.log('ERROR: ' + e.message);
    });
  } else {
    console.error("WHAT THE HECK WE AREN'T AUTHED?????? %s", state);
  }
});

// Gets the basic user info and redirects to the chat page
app.get('/basicinfo', function(req, res) {
  if (!access_token) {
    console.log("NO ACCESS TOKEN AT Basic info.")
    res.redirect('/'); // go home to start the auth process again
    return;
  }
  var options = {
      host: 'graph.facebook.com',
      port: 443,
      path: '/me?access_token=' + access_token
    };
  https.get(options, function(fbres) {
    // console.log('CHATSTATUS: ' + fbres.statusCode);
    //   console.log('HEADERS: ' + JSON.stringify(fbres.headers));

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

// The page for chatting
app.get('/chat', function(req, res) {
  if (!access_token) {
    console.log("NO ACCESS TOKEN AT CHAT.")
    res.redirect('/'); // Start the auth flow
    return;
  }
  var name = "friend";
  if (my_user && my_user.name) {
    name = my_user.name;
  }
  var locals = {name: name,
                online: Object.keys(ONLINE).map(function(jid) { return {jid:jid, user:ONLINE[jid]} }).sort(function(user1, user2) {return (user1.user.name == user2.user.name) ? 0: (user1.user.name > user2.user.name ? 1 : -1)}),
                pairs: Object.keys(PAIRS).map(function(jid) { return [ {jid:jid, user:ONLINE[jid]}, {jid:jid, user:ONLINE[PAIRS[jid]]} ]  })   }
  // console.log("locals:")
  // console.log(JSON.stringify(locals, undefined, 2));
  // console.log("online:");
  // console.log(ONLINE);
  // console.log("online as string:");
  // console.log(JSON.stringify(ONLINE, undefined, 2));
  res.render('index.jade', locals);
  //res.send("CHATTING IT UP, " + my_user.name + ", with: <ul><li>" + ONLINE.join('</li><li>') + '</li></ul>');
});

// For when you want to ping a fbid
app.get('/fbping', function(req, res) {
  var fbid = req.query['fbid'];
  var jid = '-' + fbid + '@chat.facebook.com';
  pingUser(jid);
  // head on back to chat
  res.redirect('/chat');
});

// analytics page to get the data things
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

// Deletes a pair of users
app.post('/deletepair', function(req, res) {
  console.log("Deleting pair:");
  // console.log("deletepair");
  // console.log(req);
  // console.log(req.query);
  // console.log(req.query['pair']);
  console.log("body:" + JSON.stringify(req.body, undefined, 2));
  // console.log("body.pairs:" + req.body.pair);
  var pair = req.body.pair;
  for (var i = 0; i < pair.length; i++) {
    delete PAIRS[pair[i].jid];
    console.log("Deleted " + pair[i].jid + "(" + getName(pair[i].jid) + ")")
  }
  console.log("Done deleting.");
  res.send("OK");
});
try {
  app.listen(3010);
} catch (e) {
  console.log("OH NOOOOOO OUR APP BROKE");
  console.log(e);
  app.listen(3010);
}
