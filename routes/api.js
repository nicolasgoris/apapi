const express = require('express'),
  https = require('https'),
  router = express.Router();

const covid19Router = require('./covid19');

router.use('/covid19', covid19Router);

module.exports = router;