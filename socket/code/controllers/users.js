const Services = require('../services');
const Helper = require('../utils/helper');
const Validator = require('../utils/validator');
const _ = require('lodash');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const textmessage = require('../services/messages');

class User {
    constructor(database) {
        this.services = new Services(database).register();
        this.helper = new Helper();
        this.validator = new Validator();
    }

    async register(req, res) {
        try {
            const requiredFields = ['email', 'username', 'password'];
            const isValidated = this.validator.validateFields(req.body, requiredFields);

            if (isValidated.length) {
                return res.badRequest(isValidated);
            }
        
            const response = await this.services.users.register(req.body);

            return res.success(response, '');
            //}
        } catch (e) { console.log("signup error -->> ", e)
            return res.serverError(textmessage.serverErr);
        }
    }

    async getUserById({ params: { id }, }, res, ) {
        try {
            if (!this.validator.validateByRegex('guid', id)) {
                return res.badRequest(textmessage.invalidId);
            }
            const response = await this.services.users.userDetail(id);
            return res.success(response, '');
        } catch (e) {
            return res.serverError(textmessage.serverErr);
        }
    }

    async uploadImages(req, res) {
        try {
            const response = await this.services.s3.uploadFile(req, res, 'profile', 'profileImg');
            return res.success(response);
        } catch (e) {
            return res.serverError(textmessage.serverErr);
        }
    }

    async updateProfile({ headers: { authid, authorization, language }, params: { id }, body, }, res, ) {
        try {
            if(language && language !== undefined && language === "sw") {
                textmessage = swmessage;
            }

            if (!this.validator.validateByRegex('guid', authid)) {
                return res.badRequest(textmessage.invalidId);
            }

            const checkUser = await this.services.generic.findOne('Users', { id: id, authId: authid });
            if (!checkUser) {
                return res.unAuthorized(textmessage.unauthorized);
            }

            // check if params id is valid
            if (!this.validator.validateByRegex('guid', id)) {
                return res.badRequest(textmessage.invalidId);
            }

            let { name, contact } = body;
            name = name.trim();
            body.name = name;
            const requiredFields = ['name', 'address', 'city', 'country', 'picture'];
            const isValidated = this.validator.validateFields(body, requiredFields);
            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            if (_.isUndefined(contact) || _.isEmpty(contact)) {
                delete body.contact;
            }

            if (name.length > 30) {
                return res.badRequest(textmessage.invalidNameLength);
            }

            // check script tags exists
            const checkTags = ['name', 'address', 'city', 'country', 'picture', 'about'];
            const tagExists = this.validator.validateTags(body, checkTags);
            if (tagExists.length) {
                return res.badRequest(tagExists);
            }

            body = { ...body, updatedAt: new Date() };
            const respond = await this.services.generic.update('Users', { id }, body);
            const response = await this.services.users.userDetail(id);

            return res.success(response, textmessage.updateProfile);
        } catch (e) {
            return res.serverError(textmessage.serverErr);
        }
    }

    async logout({ headers: { authid, authorization, language }, }, res, ) {
        try {
            if(language && language !== undefined && language === "sw") {
                textmessage = swmessage;
            }

            let jwtToken = '';

            if (!this.validator.validateByRegex('guid', authid)) {
                return res.badRequest(textmessage.invalidId);
            }

            const checkUser = await this.services.generic.findOne('Authentications', { id: authid });

            if (!checkUser) {
                return res.unAuthorized(textmessage.unauthorized);
            }

            if (authorization.startsWith('Bearer ')) {
                jwtToken = authorization.slice(7, authorization.length);
            }

            if (jwtToken === checkUser.token) {
                await this.services.generic.update('Authentications', { id: authid }, { token: null });
                await this.services.generic.update('Users', { authId: authid }, { deviceId: "" });
            }
            return res.success(null, textmessage.successLogout);
        } catch (e) {
            return res.serverError(textmessage.serverErr);
        }
    }

    async getUserList(req, res) {
        try {
            const response = await this.services.users.userList();
            return res.success(response, '');
        } catch (e) {
            return res.serverError(textmessage.serverErr);
        }
    }

    async blockUnblockUser({ body, headers: { language }, }, res) {
        try {
            if(language && language !== undefined && language === "sw") {
                textmessage = swmessage;
            }

            let { userBy, userTo, isBlocked } = body;

            isBlocked = Boolean(isBlocked);
            const requiredFields = ['userBy', 'userTo'];
            const isValidated = this.validator.validateFields(body, requiredFields);
            if (isValidated.length) {
                return res.badRequest(isValidated);
            }

            const userByExist = await this.services.users.isUserExist(userBy);
            if (!userByExist) {
                return res.badRequest(textmessage.userNotExists);
            }

            const userToExist = await this.services.users.isUserExist(userTo);
            if (!userToExist) {
                return res.badRequest(textmessage.userNotExists);
            }

            const recordExist = await this.services.generic.findOne('UserBlockUsers', { userBy, userTo });
            let response = {};
            if (recordExist) {
                response = recordExist;
                const { id } = recordExist;
                const toggleFav = await this.services.users.updateBlockUnblock(isBlocked, id);
            } else {
                response = await this.services.users.addToBlock(body);
            }

            let responseMsg = "", type = "unblock", message = 'Someone Unblocked you.';
            if (isBlocked) {
                responseMsg = textmessage.addToBlock;
                type = "block", message = 'Someone Blocked you.';
                //DELETE COMMENTS OF BLOCKED USER CONCEPT HERE
                const videoIdsArray = await this.services.uservideos.usersActiveVideos(userBy);
                await this.services.generic.update('UserVideoComments', { videoId: {
                        [Op.in]: videoIdsArray }, userId: userTo }, { isdelete: true, isactive: false });
            }
            if (!isBlocked) responseMsg = textmessage.removedfromBlock;

            // CREATE NOTIFICATION IN DB
            const notifyObject = {
                userBy, userTo, type, message
            }
            const mynotification = await this.services.notifications.create(notifyObject);

            // SEND BLOCK/UNBLOCK NOTIFICATION
            const userDevice = await this.services.users.userDeviceId(userTo);
            if(userDevice) {
                const {deviceId} = userDevice;
                await this.services.fcm.sendNotification(deviceId, "Block Notification", mynotification);
            }

            return res.success(response, responseMsg);
        } catch (e) {
            return res.serverError(textmessage.serverErr);
        }
    }

    async userHasBlockedUsers({ params: { id }, headers: { language }, }, res) {
        if(language && language !== undefined && language === "sw") {
            textmessage = swmessage;
        }

        const response = await this.services.users.userHasBlocked(id);
        return res.success(response, '');
    }

}

module.exports = User;