const redis = require('./redis-client');

async function incrementRoute(routeName) {
    try {
        console.log(`📊 Incrementing analytics for route: ${routeName}`);
        const result = await redis.hincrby('routeAnalytic', routeName, 1);
        console.log(`✅ Successfully incremented. New value: ${result}`);
        
        // Verify the data was stored
        const value = await redis.hget('routeAnalytic', routeName);
        console.log(`📝 Current value for ${routeName}: ${value}`);
        
        return result;
    } catch (error) {
        console.error('❌ Error incrementing route analytics:', error);
        throw error; // Re-throw to handle it in the calling code if needed
    }
}

// Helper function to view all analytics
async function getRouteAnalytics() {
    try {
        const analytics = await redis.hgetall('routeAnalytic');
        console.log('📊 Current route analytics:', analytics);
        return analytics;
    } catch (error) {
        console.error('❌ Error getting route analytics:', error);
        throw error;
    }
}

module.exports = {
    incrementRoute,
    getRouteAnalytics
};