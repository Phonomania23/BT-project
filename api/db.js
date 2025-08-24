// Combines JSON seeds into one database for json-server
module.exports = () => ({
  bloggers: require('../json/bloggers.json'),
  deals: require('../json/deals.json'),
  emails: require('../json/emails.json'),
});
