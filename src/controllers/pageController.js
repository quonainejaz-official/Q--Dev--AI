const getIndex = (req, res) => {
  res.render("index", {
    initialMessages: JSON.stringify([])
  });
};

module.exports = { getIndex };
