const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static getStatus(req, res) {
    return res.status(200).json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(req, res) {
    return res.status(200).json({
      users: await dbClient.nbUsers(), files: await dbClient.nbFiles(),
    });
  }
}

module.exports = AppController;
