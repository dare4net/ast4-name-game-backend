require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = 'ast_words_library';
const collectionName = 'words_library';

async function deduplicateAnimalCategory() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Step 1: Find duplicate 'word's in 'animals' category
        const duplicates = await collection.aggregate([
            { $match: { category: 'places' } },
            {
                $group: {
                    _id: '$word',
                    count: { $sum: 1 },
                    ids: { $push: '$_id' }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        if (!duplicates.length) {
            console.log('No duplicates found in category: animals');
            return;
        }

        // Step 2: Delete duplicates, keeping one of each
        let totalDeleted = 0;
        for (const dup of duplicates) {
            // Keep one, delete the rest
            const [keep, ...removeIds] = dup.ids;
            const deleteResult = await collection.deleteMany({ _id: { $in: removeIds } });
            totalDeleted += deleteResult.deletedCount;
        }

        console.log(`Deduplication complete. Deleted ${totalDeleted} duplicate documents.`);

    } catch (err) {
        console.error('Error during deduplication:', err);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

deduplicateAnimalCategory();
