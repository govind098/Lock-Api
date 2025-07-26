const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

PORT = 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage for table locks
const tableLocks = new Map();

// Utility function to check if a lock has expired
const isLockExpired = (lock) => {
    return Date.now() > lock.expiry;
};

// Utility function to clean up expired locks
const cleanupExpiredLocks = () => {
    for (const [tableId, lock] of tableLocks.entries()) {
        if (isLockExpired(lock)) {
            tableLocks.delete(tableId);
        }
    }
};

// Middleware to clean up expired locks on each request
app.use((req, res, next) => {
    cleanupExpiredLocks();
    next();
});

// POST /api/tables/lock -> Lock a table
app.post('/api/tables/lock', (req, res) => {
    try {
        const { tableId, userId, duration } = req.body;

        // Validate required fields
        if (!tableId || !userId || !duration) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tableId, userId, and duration are required.'
            });
        }

        // Validate duration is a positive number
        if (typeof duration !== 'number' || duration <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Duration must be a positive number in seconds.'
            });
        }

        // Check if table is already locked
        const existingLock = tableLocks.get(tableId);

        if (existingLock && !isLockExpired(existingLock)) {
            return res.status(409).json({
                success: false,
                message: 'Table is currently locked by another user.'
            });
        }

        // Create new lock
        const expiry = Date.now() + (duration * 1000); // Convert seconds to milliseconds
        const newLock = {
            tableId,
            userId,
            expiry,
            createdAt: Date.now()
        };

        tableLocks.set(tableId, newLock);

        res.status(200).json({
            success: true,
            message: 'Table locked successfully.'
        });

    } catch (error) {
        console.error('Error in POST /api/tables/lock:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
});

// POST /api/tables/unlock -> to Unlock a table
app.post('/api/tables/unlock', (req, res) => {
    try {
        const { tableId, userId } = req.body;

        // Validate required fields
        if (!tableId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tableId and userId are required.'
            });
        }

        const existingLock = tableLocks.get(tableId);

        // Check if lock exists
        if (!existingLock) {
            return res.status(404).json({
                success: false,
                message: 'No lock found for the specified table.'
            });
        }

        // Check if the userId matches the original lock creator
        if (existingLock.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only unlock tables that you have locked.'
            });
        }

        // Remove the lock
        tableLocks.delete(tableId);

        res.status(200).json({
            success: true,
            message: 'Table unlocked successfully.'
        });

    } catch (error) {
        console.error('Error in POST /api/tables/unlock:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
});

// GET /api/tables/:tableId/status - Get table lock status
app.get('/api/tables/:tableId/status', (req, res) => {
    try {
        const { tableId } = req.params;

        // Validate tableId parameter
        if (!tableId) {
            return res.status(400).json({
                success: false,
                message: 'Table ID is required.'
            });
        }

        const lock = tableLocks.get(tableId);

        // Check if lock exists and is not expired
        const isLocked = lock && !isLockExpired(lock);

        res.status(200).json({
            isLocked: isLocked
        });

    } catch (error) {
        console.error('Error in GET /api/tables/:tableId/status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
});

// Additional utility endpoint to view all locks (for debugging/testing)
app.get('/api/tables/locks', (req, res) => {
    try {
        const activeLocks = {};

        for (const [tableId, lock] of tableLocks.entries()) {
            if (!isLockExpired(lock)) {
                activeLocks[tableId] = {
                    userId: lock.userId,
                    expiry: new Date(lock.expiry).toISOString(),
                    timeRemaining: Math.max(0, Math.floor((lock.expiry - Date.now()) / 1000))
                };
            }
        }

        res.status(200).json({
            success: true,
            activeLocks: activeLocks,
            totalActiveLocks: Object.keys(activeLocks).length
        });

    } catch (error) {
        console.error('Error in GET /api/tables/locks:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Table Reservation Lock API',
        version: '1.0.0',
        endpoints: [
            'POST /api/tables/lock',
            'POST /api/tables/unlock',
            'GET /api/tables/:tableId/status',
            'GET /api/tables/locks',
            'GET /health'
        ]
    });
});

// 404 handler
app.use('/*splat', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found.'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error.'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Table Reservation Lock API is running on port${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/health`);
    console.log(`API documentation available at: http://localhost:${PORT}/`);
});

module.exports = app;
