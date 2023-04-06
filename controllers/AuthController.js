import sha1 from 'sha1';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const data = req.header('Authorization');
    const email = data.split(' ')[1].split(':')[0];
    const password = sha1(data.split(' ')[1].split(':')[1]);

    const users = dbClient.database.collections('users');
    users.findOne({ email, password }, async (err, out) => {
      if (err) {
        res.status(401).json({ error: 'Unauthorized' });
      }
      const token = v4();
      const key = `auth_${token}`;
      await redisClient.set(key, out._id.toString(), 24 * 60 * 60);
      res.status(200).json({ token });
    });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (userId) {
      await redisClient.del(token);
      res.status(401).json({});
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

module.exports = AuthController;
