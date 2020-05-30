const path = require("path");
const { promisify } = require("util");
const redis = require("redis");

const cache = redis.createClient(global.gConfig.redis_url);

cache.on("connect", () => {
  log.info("Cache successfully started")
})

cache.on("reconnecting", () => {
  log.info("Cache is restarting")
})

cache.on("error", err => {
  log.err(`Cache encountered error: ${err}`);
});

const getAsync = promisify(cache.get).bind(cache);
const setAsync = promisify(cache.set).bind(cache);
const keysAsync = promisify(cache.keys).bind(cache);

const close = () => {
  cache.unref();
  cache.end(true);
};

const read = async (key) => {
  let data = await getAsync(key);
  if (data) {
    try {
      data = JSON.parse(data);
    } catch (err) {
      log.err(`Unable to parse data for key ${key}`);
    }
  }
  return data;
};

const save = async (key, data) => {
  try {
    await setAsync(key, JSON.stringify(data));
  } catch (err) {
    const errMsg = `Unable to parse data for key ${key}`;
    log.err(errMsg);
    throw errMsg;
  }
};

const keys = async (pattern) => {
  return await keysAsync(pattern);
}

module.exports = {
  read,
  save,
  keys,
  close
};
