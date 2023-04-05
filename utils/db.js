import { MongoClient } from 'mongodb';

const { env } = process;
const host = env.DB_HOST || 'localhost';
const port = env.DB_PORT || 27017;
const database = env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true, useNewUrlParser: true });
    this.client
      .connect()
      .then(() => {
        this.database = this.client.db(database);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const userCount = await this.database.collection('users').countDocuments();
    return userCount;
  }

  async nbFiles() {
    const fileCount = await this.database.collection('files').countDocuments();
    return fileCount;
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
