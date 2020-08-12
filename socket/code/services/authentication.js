const message = require('../services/messages');

module.exports = (database) => async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const { authid } = req.headers;
    let jwtToken = '';

    if (!token || !authid) {
      res.unAuthorized(message.unauthorized);
    } else {
      if (token.startsWith('Bearer ')) {
        jwtToken = token.slice(7, token.length);
      } else {
        return res.forbidden(message.tokenErr);
      }
      const data = await database.getSingleRow('Authentications', { where: { token: jwtToken, id: authid } });

      if (data) {
        next();
      } else {
        res.unAuthorized(message.unauthorized);
      }
    }
  } catch (err) {
    console.log("authentication service error ", err)
    return res.serverError(message.serverErr);
  }
};
