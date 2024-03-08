const express = require('express');
const router = express.Router();
const searchController = require('../../controller/search.controller');

router
    .route('/')
    .get(searchController.search)

module.exports = router;