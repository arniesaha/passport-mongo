var express = require('express'),
    http = require('http'),
    path = require('path'),
    favicon = require('static-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    expressSession = require('express-session'),
    MongoStore = require('connect-mongo')(expressSession),
    bodyParser = require('body-parser');

var app = module.exports = express();
var server = require('http').createServer(app);
var router = express.Router();
//Set up the Socket.io server
var io = require('socket.io').listen(server);
var passportSocketIo = require('passport.socketio');


var dbConfig = require('./db');
var mongoose = require('mongoose');
// Connect to DB
mongoose.connect(dbConfig.url);

var db = mongoose.connection;

db.on('error', function (err) {
    console.log('connection error', err);
});
db.once('open', function () {
    console.log('connected.');
});

var Schema = mongoose.Schema;
var userSchema = new Schema({
    username : {type : String, unique : true, required : true}
});

var User = mongoose.model('loggedusers', userSchema);
var routes = require('./routes');

app.set('port', process.env.PORT || 28521);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuring Passport
var passport = require('passport');
var connCounter = 0;

var sessionMiddleware = expressSession({
    name: 'crosslink',
    secret: 'arnab',
    store: new MongoStore({
        url: dbConfig.url
    }),
    proxy: true,
    resave: true,
    saveUninitialized: true
});

// TODO - Why Do we need this key ?
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

server.listen(app.get('port'), function(){
  console.log('listening on port : '+app.get('port'));
});



io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

io.use(passportSocketIo.authorize({ //configure socket.io
   cookieParser: cookieParser,
   secret:      'arnab',    // make sure it's the same than the one you gave to express
   store:       new MongoStore({
                    url: dbConfig.url
                }),        
   success:     onAuthorizeSuccess,  // *optional* callback on success
   fail:        onAuthorizeFail,     // *optional* callback on fail/error
}));


/*io.sockets.on('connection', function(socket) {
  console.log(socket.request.user); 
});*/

io.sockets.on('connection', require('./routes/socket'));


 // Using the flash middleware provided by connect-flash to store messages in session
 // and displaying in templates
var flash = require('connect-flash');
app.use(flash());

// Initialize Passport
var initPassport = require('./passport/init');
initPassport(passport);

var routes = require('./routes/index')(passport);
app.use('/', routes);


/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

function onAuthorizeSuccess(data, accept){

  var username = data.user.username;
  
  

  var user = new User({
        username : username
  });


  user.save(function (err, data) {
    if (err) console.log(err);
    else {               
        console.log('Saved : ', data );
    }
  }); 

  console.log('successful connection to socket.io ');
  
  accept(); //Let the user through
}

function onAuthorizeFail(data, message, error, accept){ 
  if(error) accept(new Error(message));
  console.log('failed connection to socket.io:', message);
  accept(null, false);  
}



module.exports = app;
