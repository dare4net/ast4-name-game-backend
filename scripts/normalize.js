require('dotenv').config();
const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
const dbName = 'ast_words_library';
const collectionName = 'words_library';

async function normalizeAnimalWords() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Find all documents in 'animals' category
    const cursor = collection.find({ category: 'animals' });

    let updatedCount = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const originalWord = doc.word;
      const normalizedWord = typeof originalWord === 'string'
        ? originalWord.toLowerCase()
        : originalWord;

      if (normalizedWord !== originalWord) {
        await collection.updateOne(
          { _id: doc._id },
          {
            $set: {
              word: normalizedWord,
              updated_at: new Date(),
            },
          }
        );
        updatedCount++;
      }
    }

    console.log(`Normalized ${updatedCount} animal word(s) to lowercase.`);
  } catch (error) {
    console.error('Error normalizing words:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

normalizeAnimalWords();
