// vim: ts=2 sw=2 expandtab
(function () {
  window['spacechat'] = window['sapcechat'] || io.connect('http://localhost');
  var socket = window.spacechat;
  var $out = $("#chat_out"), $in = $("#chat_in"), $me = $("#my_nick");
  function show_message(data) {
    $in.append($("<pre>", {
      text: data.from + ": " + data.message
    }));
  }
  socket.on('connect', function () {
    $me.val(this.socket.sessionid);
  });
  socket.on('news', function (data) {
    $in.append($("<pre>", { text: "news: " + JSON.stringify(data) }));
    socket.emit('my other event', { my: 'data' });
  });
  socket.on('msg', show_message);
  $("input").on('keypress', function (e) {
    if (e.keyCode == 13) {
      $(this).trigger('return_pressed');
    }
  });
  $out.on('return_pressed', function () {
    var msg = { from: "me", message: $(this).val() };
    socket.emit("msg", msg);
    show_message(msg);
    $(this).val('');
  });
  $me.on('return_pressed', function () {
    var nick = $(this).val();
    socket.emit("nick", nick, function (success) {
      if (success) {
        $me.prop('disabled', true);
      } else {
        $me.val("sorry, taken, try again");
      }
    });
  });

}) ();
