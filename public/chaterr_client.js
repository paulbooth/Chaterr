var online = [];
var pairs = [];
var my_user = null;
var hostUrl = 'http://thepaulbooth.com:3010';
//var hostUrl = 'http://localhost:3000';
$(function(){
  refreshData();
  setInterval(refreshData, 5000);
})

function refreshData() {
  $.get(
    "getdata",
    function(data) {
      data = JSON.parse(data);
      online = data.online;
      pairs = data.pairs;
      my_user = data.my_user;
      mydata = data;
      refreshUI();
    }
  );
}

function refreshPairList() {
  var $pairslist = $('#pairslist');
  $pairslist.empty();
  var pairsAsList = getListPairs();
  for (var i = 0; i < pairsAsList.length; i++) {
    var pair = pairsAsList[i];
    var $li = $('<li></li>');
    for (var j = 0; j < pair.length; j++) {
      if (pair[j] && pair[j].user) {
        var $a = $('<a>' + pair[j].user.name +'</a>');
        $a.attr('href', 'http://facebook.com/' + pair[j].user.id);
        $li.append($a);
      }
    }
    var $delbutton = $('<button>DELETE</buton>');
    $delbutton.click(function() {
      console.log("del button pressed");
      console.log(pair);
      $.post(
        "deletepair",
        {"pair": pair},
        function(data) {
          console.log("deleted pair");
          console.log(data);
          console.log(pair);
          refreshData();
        }
      );
    })
    $li.append($delbutton);
    $pairslist.append($li);
  }
}

function refreshOnlineList() {
  var $onlinelist = $('#onlinelist');
  $onlinelist.empty();
  var onlineAsList = getListOnline();
  for (var i = 0; i < onlineAsList.length; i++) {
    var user = onlineAsList[i];
    var $li = $('<li></li>');

    var $a = $('<a>' + user.user.name +'</a>');
    $a.attr('href', 'http://facebook.com/' + user.user.id);
    $li.append($a);

    var $ping = $('<a>PING</a>');
    $ping.attr('href', hostUrl + '/fbping?fbid=' + user.user.id);
    $ping.css('margin-left', '10px');
    $li.append($ping);

    $onlinelist.append($li);
  }

}

function refreshUI() {
  refreshPairList();
  refreshOnlineList();
}

function getListPairs() {
  return Object.keys(pairs).map(function(jid) { return [ {jid:jid, user:online[jid]}, {jid:pairs[jid], user:online[pairs[jid]]} ]  })
}

function getListOnline() {
  return Object.keys(online).map(function(jid) { return {jid:jid, user:online[jid]} }).sort(function(user1, user2) {return (user1.user.name == user2.user.name) ? 0: (user1.user.name > user2.user.name ? 1 : -1)})
}