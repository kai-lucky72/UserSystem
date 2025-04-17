import express from 'express';
import { db } from '../db';
import { pool } from '../db';
import { desc } from 'drizzle-orm';
import { format, formatDistanceToNow } from 'date-fns';

const router = express.Router();

// Get recent activity feed for the dashboard
router.get('/', async (req, res) => {
  try {
    // Get limit from query params or default to 10
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Query to fetch recent activities from users, help_requests, and other tables
    // Using UNION to combine multiple activity types
    const query = `
      (SELECT 
        'user_registered' as type,
        CONCAT(first_name, ' ', last_name, ' was registered') as message,
        created_at as timestamp,
        id
      FROM users
      ORDER BY created_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        CASE WHEN role = 'manager' THEN 'manager_added' ELSE 'agent_added' END as type,
        CONCAT(first_name, ' ', last_name, ' was added as ', role) as message,
        created_at as timestamp,
        id
      FROM users
      WHERE role IN ('manager', 'agent')
      ORDER BY created_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'help_request_created' as type,
        CONCAT(name, ' submitted a help request') as message,
        created_at as timestamp,
        id
      FROM help_requests
      ORDER BY created_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'help_request_resolved' as type,
        CONCAT('Help request from ', name, ' was resolved') as message,
        updated_at as timestamp,
        id
      FROM help_requests
      WHERE resolved = true
      ORDER BY updated_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'client_added' as type,
        CONCAT('New client ', first_name, ' ', last_name, ' was added') as message,
        created_at as timestamp,
        id
      FROM clients
      ORDER BY created_at DESC
      LIMIT 5)
      
      ORDER BY timestamp DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    // Map the results to add readable time formats
    const activities = result.rows.map(activity => ({
      ...activity,
      id: `${activity.type}-${activity.id}`, // Ensure unique IDs
      timestamp: activity.timestamp
    }));
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

export default router; 