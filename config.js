const dotenv = require('dotenv');
const path = require('path');

const root = path.join.bind(this, __dirname);
dotenv.config({ path: root('.env') });

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGO_URL: "mongodb://localhost/users_test",
  SESSION_SECRET: "asdasdasdasd",
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  PER_PAGE: process.env.PER_PAGE,
  DESTINATION: 'uploads'
};
