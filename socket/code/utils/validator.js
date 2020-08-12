/* eslint-disable class-methods-use-this */
const Helper = require('./helper');
const regex = require('./regex');

class Validator {
  constructor(database) {
    this.database = database;
    this.helper = new Helper();
  }

  validateFields(input, validateAgainst) {
    const errors = [];
    const inputKeys = Object.keys(input);

    // validate if input is not empty
    inputKeys.forEach((item) => {
      if (validateAgainst.includes(item) && !input[item]) {
        errors.push(`${this.helper.capitalize(item)} can not be blank`);
      }
    });

    // validate if key is not missing
    validateAgainst.forEach((item) => {
      if (!inputKeys.includes(item)) {
        errors.push(`${this.helper.capitalize(item)} can not be blank`);
      }
    });

    return errors[0] || [];
  }

  validateByRegex(type, value) {
    const regexValue = regex[type];

    return regexValue.test(value);
  }

  validateTags(input, validateAgainst) {
    const errors = [];
    const regexValue = regex.htmlTags;

    validateAgainst.forEach((item) => {
      const check = regexValue.test(input[item]);

      if (check) {
        errors.push(`Html tags are not allowed in ${item}`);
      }
    });

    return errors[0] || [];
  }

}

module.exports = Validator;
