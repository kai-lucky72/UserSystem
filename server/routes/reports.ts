import express from 'express';
import { db } from '../db';
import { pool } from '../db';
import { dailyReports } from '@shared/schema';
import { count, desc, gte } from 'drizzle-orm';
import { subDays } from 'date-fns';

const router = express.Router();

// Get count of active reports (defined as reports from the last 30 days)
router.get('/active', async (req, res) => {
  try {
    // Consider reports from the last 30 days as "active"
    const cutoffDate = subDays(new Date(), 30);
    
    const query = `
      SELECT COUNT(*) as count
      FROM daily_reports
      WHERE date >= $1
    `;
    
    const result = await pool.query(query, [cutoffDate]);
    const count = parseInt(result.rows[0]?.count || '0');
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching active reports count:', error);
    res.status(500).json({ error: 'Failed to fetch active reports count' });
  }
});

// Get recent reports with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // Get reports with user details
    const query = `
      SELECT 
        dr.*, 
        u.first_name as agent_first_name,
        u.last_name as agent_last_name
      FROM daily_reports dr
      JOIN users u ON dr.agent_id = u.id
      ORDER BY dr.date DESC
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM daily_reports
    `;
    
    const [reportsResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);
    
    const reports = reportsResult.rows;
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      data: reports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

export default router; 