var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var path = require('path');
var fs = require('fs');
require('dotenv').config();

var app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:80',
  'https://mynetwork-red.vercel.app',
  'https://socnet-client.vercel.app',
  'https://socialnetwork.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, от curl или мобильных приложений)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.set('view engine', 'pug');
// Раздавать статические файлы из папки 'uploads'
// app.use('/uploads', express.static('uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', require('./routes'));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
});

// ✅ Обработчик ошибок — возвращаем JSON, а не рендерим шаблон
app.use(function(err, req, res, next) {
  console.error(err.stack); // Логируем ошибку для отладки
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
