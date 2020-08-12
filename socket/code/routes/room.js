const User = require('../controllers/rooms');

class UsersRoute {
  constructor(router, database, authentication) {
    this.router = router;
    this.user = new User(database);
    this.authentication = authentication(database);
  }

  routes() {
    this.router.get(`/get_owner_Room/:room`, this.authentication, (req, res) => this.user.getRoomOwner(req, res));
    this.router.get(`/get_explore_rooms/:publish/:category/:private`, this.authentication, (req, res) => this.user.getExploreRoom(req, res));
    this.router.get(`/get_my_rooms/:email/:category/:private`, this.authentication, (req, res) => this.user.getMyRooms(req, res));
    this.router.post(`/create_owner_Room`, (req, res) => this.user.createOwnerRoom(req, res));
    this.router.put(`/update_owner_Room`, (req, res) => this.user.updateOwnerRoom(req, res));
    this.router.post(`/join_user_in_Room`, (req, res) => this.user.joinInRoom(req, res));
    this.router.post(`/join_user_in_paidRoom`, (req, res) => this.user.joinInPaidRoom(req, res));
    this.router.get(`/roomInfo/:room/:email`, (req, res) => this.user.getRoomInfo(req, res));
  }
}

module.exports = UsersRoute;
