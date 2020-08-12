/* eslint-disable class-methods-use-this */

const uuidv1 = require('uuid/v1');
const pbkdf2 = require('pbkdf2');
const jwt = require('jsonwebtoken');
const moment = require('moment');

class Helper {
  constructor() {}

  createUUID() {
    return uuidv1();
  }

  hashPassword(password) {
    return pbkdf2.pbkdf2Sync(password, 'salt', 100000, 16, 'sha512').toString('hex');
  }

  createToken(data) {
    data = `${data}+${this.makeRandomNumber()}`;
    return jwt.sign(data, 'talentikaapi');
  }

  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  makeRandomNumber() {
    let text = '';
    const possible = '0123456789';

    for (let i = 0; i < 4; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }

  pagination(items, page, per_page) {
    var page = page || 0;
    var per_page = per_page || 10;
    const offset = page * per_page;

    const paginatedItems = items.slice(offset).slice(0, per_page);
    const total_pages = Math.ceil(items.length / per_page);

    return paginatedItems;
  }

  getMonthName(monthNumber) {
    const monthNames = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

    return monthNames[monthNumber];
  }

  // calculate average rating and round upto 2 digits
  calculateAverageRating(sumOfNumbers, count) {
    return parseFloat((sumOfNumbers / count).toFixed(2));
  }

  /** create alpha numeric string* */
  randomString(length) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';

    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  getMonthDateRange(year, month) {
    // month in moment is 0 based, so 9 is actually october, subtract 1 to compensate
    // array is 'year', 'month', 'day', etc
    const startDate = moment([ year, month - 1 ]);

    // Clone the value before .endOf()
    let endDate = moment(startDate).endOf('month');

    // return { start: moment(startDate, 'YYYY-MM-DD').add(1, 'day'), end: moment(endDate, 'YYYY-MM-DD').add(1, 'day') };
    endDate = moment(endDate).add(1, 'day');
    endDate = moment(endDate).startOf('day');

    return { start: moment(startDate).format('YYYY-MM-DD'), end: moment(endDate).format('YYYY-MM-DD') };
  }

  getBoolean(val) {
    return !!JSON.parse(String(val).toLowerCase());
  }
}

module.exports = Helper;
