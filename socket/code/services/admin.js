const Helper = require('../utils/helper');
const _ = require('lodash');

class Admin {
    constructor(database) {
        this.database = database;
        this.model = database.getModelInstance();
        this.helper = new Helper();
    }

    async updateResetPasswordToken(id) {
        const resetPasswordToken = this.helper.randomString(16);
        // add one hour in current time
        const currentDate = new Date();
        currentDate.setHours(currentDate.getHours() + 1);
        const resetPasswordExpires = currentDate.getTime();

        await this.database.update(
            'Authentications', { where: { id } }, {
                resetPasswordToken,
                resetPasswordExpires,
            },
        );

        return resetPasswordToken;
    }

    async updateAppDisapprove(data, status) {
        const { model, id } = data;
        const updateUser = await this.database.update('UserVideos', { where: { id }, cascade: true }, { isApprove: status });

        return updateUser;
    }

    async updateStatus(data, status) {
        const { model, id } = data;
        const updateUser = await this.database.update(model, { where: { id }, cascade: true }, { isactive: status });
        
        return updateUser;
    }

    async deleteRecord(data) {
        const { model, id } = data;
        const trashed = await this.database.update(model, { where: { id }, cascade: true }, { isdelete: true });

        return trashed;
    }

    async allUsers() {
        const user = await this.database.getAllRows('Users', {
            where: { isdelete: false },
            include: [{
                model: this.model.Authentications,
                attributes: ['role'],
                where: { 'role': 'user' }
            }, ],
        });

        return user;
    }

    async userListWithPagination(data, whereCondition) {
        const { pageNo, limit } = data;

        const user = await this.database.getAllRows('Users', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                ['createdAt', 'DESC']
            ],
            include: [{
                model: this.model.Authentications,
                attributes: ['role', 'protocol', 'provider', 'isdelete', 'isactive'],
                where: { 'role': 'user' }
            }, ],
        });

        return user;
    }

    async bannerListWithPagination(data, whereCondition) {
        const { pageNo, limit } = data;

        const getListing = await this.database.getAllRows('Banners', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                ['createdAt', 'DESC']
            ],
        });

        return getListing;
    }

    async categoryListWithPagination(data, whereCondition) {
        const { pageNo, limit } = data;

        const getListing = await this.database.getAllRows('Categories', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                ['createdAt', 'DESC']
            ],
        });

        return getListing;
    }

    async eventListWithPagination(data, whereCondition) {
        const { pageNo, limit } = data;

        const getListing = await this.database.getAllRows('Events', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                ['createdAt', 'DESC']
            ],
        });

        return getListing;
    }

    async orgEventListWithPagination(data, whereCondition) {
        const { pageNo, limit } = data;

        const getListing = await this.database.getAllRows('OrganiserEvents', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                ['createdAt', 'DESC']
            ],
            include: [
                { model: this.model.Events, attributes: ['name'] },
                { model: this.model.UserRequests, attributes: ['name'] }
            ],
        });

        return getListing;
    }

    async seasonWinnersListWithPagination(data, whereCondition) {
        const { pageNo, limit } = data;

        const getListing = await this.database.getAllRows('Seasons', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                ['startDate', 'DESC']
            ],
            include: [{
                model: this.model.UserVideos,
                required: false,
                where: { isWinner: true },
                order: [
                    ['winnerNo', 'DESC']
                ],
                include: [
                    { model: this.model.Users, attributes: ['name'] }
                ]
            }],
        });

        return getListing;
    }

    async userVideosListWithPagination(data, whereCondition) {
        let { pageNo, limit, sortKey, sortDirection } = data;

        if (sortKey == "") {
            sortKey = "createdAt";
        }

        if (sortDirection == "") {
            sortDirection = "desc";
        }

        const getListing = await this.database.getAllRows('UserVideos', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                [sortKey, sortDirection]
            ],
            include: [
                { model: this.model.Users, attributes: ['name'] },
            ]
        });

        return getListing;
    }

    async userRequestsListWithPagination(data, whereCondition) {
        let { pageNo, limit, sortKey, sortDirection } = data;

        if (sortKey == "") {
            sortKey = "createdAt";
        }

        if (sortDirection == "") {
            sortDirection = "desc";
        }

        const getListing = await this.database.getAllRows('UserRequests', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                [sortKey, sortDirection]
            ],
            include: [
                { all: true, },
            ]
        });

        return getListing;
    }

    async notificationsListWithPagination(data, whereCondition) {
        let { pageNo, limit } = data;

        const getListing = await this.database.getAllRows('Notifications', {
            where: whereCondition,
            offset: limit * (pageNo - 1),
            limit,
            order: [
                ["createdAt", "desc"]
            ],
            include: [
                { model: this.model.Users, attributes: ['name'] },
            ]
        });

        return getListing;
    }


}

module.exports = Admin;