const express = require('express'),
  http = require('http'),
  path = require('path');

const indexRouter = require('./routes/index'),
  apiRouter = require('./routes/api');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.use('/public', express.static('public'));
app.use('/', indexRouter);
app.use('/api', apiRouter);

app.set('port', process.env.PORT || 3001);

const server = http.createServer(app);
server.listen(app.get('port'), () => console.log(`listening on ${app.get('port')}`));