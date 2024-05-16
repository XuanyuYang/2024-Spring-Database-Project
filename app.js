const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const {Pool} = require('pg');
const cors = require('cors');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const loginRouter = require('./routes/login');
const registerRouter = require('./routes/register');
const addblockRouter = require('./routes/addBlock');
const logoutRouter = require('./routes/logout');
const getblockapplicationRouter = require('./routes/getBlockApplication');
const processblockapplicationRouter = require('./routes/processBlockApplication');
const addfriendRouter = require('./routes/addFriend');
const getfriendapplicationRouter = require('./routes/getFriendApplication');
const processfriendapplicationRouter = require('./routes/processFriendApplication');
const getfriendRouter = require('./routes/getFriend');
const addneighborRouter = require('./routes/addNeighbor');
const getneighborRouter = require('./routes/getNeighbor');
const getblockRouter = require('./routes/getBlock');
const gethoodRouter = require('./routes/getHood');
const addfollowblockRouter = require('./routes/addFollowBlock');
const addthreadRouter = require('./routes/addThread');
const getmessageRouter = require('./routes/getMessage');
const addmessageRouter = require('./routes/addMessage');
const getprofileRouter = require('./routes/getprofile');
const updateprofileRouter = require('./routes/updateProfile');
const searchkeywordmessageRouter = require('./routes/searchKeywordMessage');
const searchlocationmessageRouter = require('./routes/searchLocationMessage');
const exitblockRouter = require('./routes/exitBlock');
const getlastloginRouter = require('./routes/getLastLogin');
const getnewmemberprofileRouter = require('./routes/getNewMemberProfile');

const app = express();

// Postgres
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'proj24s',
  password: '0311',
  port: 5432,
});

async function initializePool() {
  try {
    await pool.connect();
    console.log('Postgres connected');
    module.exports = { pool };
  } catch (err) {
    console.error('Postgres connection error:', err);
    process.exit(1);
  }
}

initializePool();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/login', loginRouter);
app.use('/api/register', registerRouter);
app.use('/api/addblock', addblockRouter);
app.use('/api/logout', logoutRouter);
app.use('/api/getblockapplication', getblockapplicationRouter);
app.use('/api/processblockapplication', processblockapplicationRouter);
app.use('/api/addfriend', addfriendRouter);
app.use('/api/getfriendapplication', getfriendapplicationRouter);
app.use('/api/processfriendapplication', processfriendapplicationRouter);
app.use('/api/getfriend', getfriendRouter);
app.use('/api/addneighbor', addneighborRouter);
app.use('/api/getneighbor', getneighborRouter);
app.use('/api/getblock', getblockRouter);
app.use('/api/gethood', gethoodRouter);
app.use('/api/addfollowblock', addfollowblockRouter);
app.use('/api/addthread', addthreadRouter);
app.use('/api/getmessage', getmessageRouter);
app.use('/api/addmessage', addmessageRouter);
app.use('/api/getprofile', getprofileRouter);
app.use('/api/updateprofile', updateprofileRouter);
app.use('/api/searchkeywordmessage', searchkeywordmessageRouter);
app.use('/api/searchlocationmessage', searchlocationmessageRouter);
app.use('/api/exitblock', exitblockRouter);
app.use('/api/getlastlogin', getlastloginRouter);
app.use('/api/getnewmemberprofile', getnewmemberprofileRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
