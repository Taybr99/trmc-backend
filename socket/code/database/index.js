const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Models = require('../models');
const logger = require('../config/logger');

const config = require('../config/');

class Database {
    constructor(DB_CONNECTION_STRING) {
        try {
            this.sequelize = new Sequelize(DB_CONNECTION_STRING, {
                // disable logging; default: console.log
                logging: false,
            });

            this.models = Models(this.sequelize);
        } catch (e) {
            logger.log('error', 'Exception raised while connecting to database...', { detail: e.toString() });
        }
    }

    authenticate() {
        return this.sequelize.authenticate();
    }

    getModelInstance() {
        return this.models;
    }

    getModelFields(modelName) {
        let modelquery = "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE table_schema='public' AND table_name='"+modelName+"'";
        const response = this.sequelize.query(modelquery);
        
        return response;
    }

    getSequelizeInstance() {
        return this.sequelize;
    }

    getSingleRow(modelName, args) {
        return this.models[modelName].findOne(args);
    }

    queryMethod(modelName, query) {
        const model = this.models[modelName];

        return this.sequelize.query(query, { model });
    }

    getMaxValue(modelName, attribute, query) {
        return this.models[modelName].max(attribute, query);
    }

    getAllRows(modelName, args) {
        return this.models[modelName].findAll(args);
    }

    create(modelName, query) {
        return this.models[modelName].create(query);
    }

    getRecordsCount(modelName) {
        return this.models[modelName].findAndCountAll();
    }

    update(modelName, query, data) {
        return this.models[modelName].update(data, query);
    }

    delete(modelName, query) {
        return this.models[modelName].destroy(query);
    }

    count(modelName, query) {
        return this.models[modelName].count(query);
    }

    getAllDistinctRows(modelName, args) {
        return this.models[modelName].findAll(args);
    }

    getFutureEvents(modelName, query) {
        query.where.eventTime = {
           [Op.gte]: new Date(),
        };
        return this.models[modelName].findAll(query);
    }

    getLatestSeason(modelName, query) { 
        query.where.startDate = {
           [Op.lt]: new Date(),
        };
        query.where.endDate = {
           [Op.gte]: new Date(),
        };
        return this.models[modelName].findOne(query);
    }

}

module.exports = Database;