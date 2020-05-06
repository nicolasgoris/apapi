const express = require('express'),
  https = require('https'),
  router = express.Router(),
  app = express();

const covid19Router = require('./covid19');

app.use('/api/covid19', covid19Router);

module.exports = router;