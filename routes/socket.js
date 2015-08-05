/*
 * Serve content over a socket
 */

module.exports = function (socket) {
  
  setInterval(function () {

  	var UserSchema = require('mongoose').model('loggedusers');

  	UserSchema.count({}, function(err, c){
        
        console.log('Count is ' + c);
        socket.emit('send:time', {
      		time: c
    	});

    });

    
  }, 1000);
};