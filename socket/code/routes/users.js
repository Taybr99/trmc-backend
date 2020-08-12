const User = require('../controllers/users');

class UsersRoute {
  constructor(router, database, authentication) {
    this.router = router;
    this.user = new User(database);
    this.authentication = authentication(database);
  }

  routes() {
    this.router.post(`/register_user`, (req, res) => this.user.register(req, res));
    this.router.post(`/user_logged_in`, (req, res) => this.user.userLoggedin(req, res));
    this.router.post(`/logout`, (req, res) => this.user.logout(req, res));
    this.router.post(`/forgotPassword`, (req, res) => this.user.forgotPassword(req, res));    
    this.router.get(`/user_session/:browser/:ip/:systemIp/:room`, this.authentication, (req, res) => this.user.getUserSession(req, res)); 
    this.router.post(`/send_text_message`, (req, res) => this.user.sendTextMessage(req, res));
    this.router.post(`/sendEmail`, (req, res) => this.user.sendEmail(req, res));
  }
}

module.exports = UsersRoute;
