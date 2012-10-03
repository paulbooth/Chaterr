var apiKey = '486184408064731';
var secretKey = '042681525933472c91d1c6e57ea1219e';
var access_token = null; // For Facebook
var my_user = null; // The current Facebook user, so we don't request a bunch

var xmpp = require('./simple-xmpp');
var argv = process.argv;
var https = require('https');
var childProcess = require('child_process'); // to call external programs

var hostUrl = 'http://localhost:3000';

var express = require('express');
// if there are four arguments, they called
// node echo.js USER PASSWORD
// and we should let them use Google chat
var RANDO_CHANCE = 0, // Chance of getting a rando pulled in when a new person pings in
    num_initial_randos = 0,
    CLEVERBOT = false,
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


xmpp.on('online', function() {
  console.log('Yes, I\'m connected!');
  // put in a timeout to make sure that there are people online
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

xmpp.on('chat', function(from, message) {
  console.log("#########################CHAT:" + message + " FROM:" + from);
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
  console.error(err);
});

xmpp.on('buddy', function(jid, state) {
  console.log("---------------%s is now '%s'", jid, state);
  if (state == xmpp.STATUS.ONLINE) {
    // assume facebook
    addUserToOnline(jid);
  } else {
    removeUserFromOnline(jid);
  }
});


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

function pingUser(jid, message) {
  var first_messages = [
      'hi',
      'hey',
      'what\'s up?',
      'sup',
      'how was your day?',
      'what are you up to right now?',
      'how have you been?',
      'hey you :)'
    ];
  if (!message) {
    message = first_messages[Math.floor(Math.random() * first_messages.length)];
  }
  xmpp.send(jid, message);
  console.log ("Pinged '" + message + "' to " + jid);
}

function sendMessageToPartner(from, message) {
  var lonely = PAIRS[from];
  console.log("going to tell " + from + "'s partner (" + lonely + "): " + message);
  // check if need a partner
  if (lonely == null || lonely == undefined) {
    console.log(JSON.stringify(PAIRS, undefined, 2));
    lonely = getLoneliestPair(from);
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
  console.log("sending " + lonely + " message: " + message);
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

  if (!from_user || !from_user.first_name || !from_user.last_name) {
    message = message.replace(new RegExp(from_user.first_name, 'gi'), "I").replace(new RegExp(from_user.last_name, 'gi'), "myself");
  } else {
    message = message.replace(new RegExp(from_user.first_name, 'gi'), my_user.first_name).replace(new RegExp(from_user.last_name, 'gi'), my_user.last_name);
    if (message.split(/\s/).join("").toUpperCase() == ("" + from_user.first_name[0] + from_user.last_name[0]).toUpperCase()) {
      return "" + my_user.first_name[0] + my_user.last_name[0]
    }
  }

  if (!to_user || !to_user.first_name || !to_user.last_name) {
    message = message.replace(new RegExp(first_name_secret, 'gi'), "friend").replace(new RegExp(last_name_secret, 'gi'), "Mate");
  } else {
    message = message.replace(new RegExp(first_name_secret, 'gi'), to_user.first_name).replace(new RegExp(last_name_secret, 'gi'), to_user.last_name);
    if (message.split(/\s/).join("").toUpperCase() == ("" + my_user.first_name[0] + my_user.last_name[0]).toUpperCase()) {
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
  while (rando == null || rando == my_jid || rando in BLACKLIST || rando in exclude ) {
    rando = ONLINE[Math.floor ( Math.random() * ONLINE.length )];
    if (rando in PAIRS && PAIRS[rando] in PAIRS) {
      console.log("rando " + rando + " is already in PAIRS with partner:" + PAIRS[rando]);
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
  try {
    xmpp.connect({
      jid: '-WWW.FACEB0OK.C0M@chat.facebook.com', // where 123456 is the users facebook id
      api_key: apiKey, // api key of your facebook app
      secret_key: secretKey, // secret key of your facebook app
      access_token: access_token, // users current session key
      host: 'chat.facebook.com'
    });
  } catch (e) {
    console.log("startXmppserver error");
    console.log(e);
  }
}

console.log("Facebook mode activated. Go to " + hostUrl);
// The actual app and server
var app = express();
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

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
  var locals = {name: my_user.name,
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
