require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection URI - update with your connection string
const uri = process.env.MONGODB_URI;
const dbName = 'ast_words_library'; // update with your database name
const collectionName = 'words_library';

async function importAnimals() {
    try {
        // Read the JSON file
        const animalsData = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../../../animals_300.json'), 'utf-8')
        );

        // Connect to MongoDB
        const client = new MongoClient(uri);
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Add additional fields to each document
        const enhancedData = animalsData.map(item => ({
            ...item,
            created_at: new Date(),
            updated_at: new Date(),
            validated: true, // since these are pre-validated animal names
            source: 'curated_list'
        }));

        // Insert the documents
        const result = await collection.insertMany(enhancedData, { ordered: false });
        console.log(`Successfully inserted ${result.insertedCount} animals`);

        // Create indexes for better query performance
        await collection.createIndex({ word: 1 }, { unique: true });
        await collection.createIndex({ category: 1 });
        console.log('Indexes created');

        // Close the connection
        await client.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        console.error('Error importing animals:', error);
        process.exit(1);
    }
}

// Run the import
importAnimals().catch(console.error);
