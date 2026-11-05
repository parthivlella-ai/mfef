const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'meditrack_default_jwt_secret_dev', {
    expiresIn: '30d',
  });
};

module.exports = generateToken;

