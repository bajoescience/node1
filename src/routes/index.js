const express = require('express');
const app = express.Router();

app.use('/auth', require('./api/auth')); //auth
app.use('/users', require('./api/users')); //users
app.use('/account', require('./api/account')); //profile
app.use('/transactions', require('./api/transactions')) //transactions
app.use('/events', require('./api/events')) //events
app.use('/files', require('./api/files')) //files
app.use('/products', require('./api/products')); //products
app.use('/wallets', require('./api/wallets')); //wallets
app.use('/search', require('./api/search')); //wallets
app.use('/subscriptions', require('./api/subscriptions')); //wallets
app.use('/notifications', require('./api/notifications')); //wallets
// app.use('/youtube', require('./api/youtube')); //youtube

module.exports = app;