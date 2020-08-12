module.exports = {
  email: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
  guid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  htmlTags: /(<([^>]+)>)/gi,
  number: /^\d+$/,
  whitespace: /\s/,
  decimalNumber: /^[0-9.]*$/,
};
