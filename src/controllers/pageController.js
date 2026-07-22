const getIndex = (req, res) => {
  res.render("index", {
    initialMessages: JSON.stringify([]),
    googleClientId: process.env.GOOGLE_CLIENT_ID || ""
  });
};

module.exports = { getIndex };
