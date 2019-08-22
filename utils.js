const jwt = require('jsonwebtoken')
const APP_SECRET = 'GraphQL-is-aw3some'
var Cookie = require('request-cookies').Cookie;

function getUserId(context) {
  const Authorization = context.request.get('Authorization')
  var tokenCookie = context.request.cookies['token'];

  if (tokenCookie) {
    const token = tokenCookie;//Authorization.replace('Bearer ', '');
    const { userId } = jwt.verify(token, APP_SECRET);
    return userId;
  }

  return null;
}

module.exports = {
  APP_SECRET,
  getUserId,
}