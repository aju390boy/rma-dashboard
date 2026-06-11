module.exports = async () => {
  await global.__MONGOD.stop();
};
