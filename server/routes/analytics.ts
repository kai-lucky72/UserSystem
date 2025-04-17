import express from 'express';
import { db } from '../db';
import { pool } from '../db';
import { count, desc, sql, eq, and, gte, lte } from 'drizzle-orm';
import { users, helpRequests, clients, dailyReports } from '@shared/schema';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const router = express.Router();

// Get real monthly performance data for the last X months
router.get('/monthly', async (req, res) => {
  try {
    // Default to 12 months if not specified
    const months = parseInt(req.query.months as string) || 12;
    
    // Prepare data to return
    const results = [];
    
    // Loop through each month and query the database
    for (let i = 0; i < months; i++) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthName = format(monthDate, 'MMM');
      
      // Get total client interactions (this will be from daily reports)
      const interactionsQuery = `
        SELECT COUNT(*) as total
        FROM daily_reports
        WHERE date >= $1 AND date <= $2
      `;
      const interactionsResult = await pool.query(interactionsQuery, [monthStart, monthEnd]);
      const totalInteractions = parseInt(interactionsResult.rows[0]?.total || '0');
      
      // Get count of active agents in this month
      const agentsQuery = `
        SELECT COUNT(DISTINCT agent_id) as count
        FROM daily_reports
        WHERE date >= $1 AND date <= $2
      `;
      const agentsResult = await pool.query(agentsQuery, [monthStart, monthEnd]);
      const activeAgents = parseInt(agentsResult.rows[0]?.count || '0');
      
      // Get new clients in this month
      const clientsQuery = `
        SELECT COUNT(*) as count
        FROM clients
        WHERE created_at >= $1 AND created_at <= $2
      `;
      const clientsResult = await pool.query(clientsQuery, [monthStart, monthEnd]);
      const newClients = parseInt(clientsResult.rows[0]?.count || '0');
      
      results.push({
        month: monthName,
        totalInteractions,
        activeAgents,
        newClients
      });
    }
    
    // Return the results in reverse order (oldest month first)
    res.json(results.reverse());
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    res.status(500).json({ error: 'Failed to fetch monthly performance data' });
  }
});

// Get stats from the previous month for comparison
router.get('/previous-month', async (req, res) => {
  try {
    const prevMonth = subMonths(new Date(), 1);
    const prevMonthStart = startOfMonth(prevMonth);
    const prevMonthEnd = endOfMonth(prevMonth);
    
    // Get manager count from previous month (rough estimate)
    const managersQuery = `
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'manager' AND created_at <= $1
    `;
    const managersResult = await pool.query(managersQuery, [prevMonthEnd]);
    const managers = parseInt(managersResult.rows[0]?.count || '0');
    
    // Get agent count from previous month
    const agentsQuery = `
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'agent' AND created_at <= $1
    `;
    const agentsResult = await pool.query(agentsQuery, [prevMonthEnd]);
    const agents = parseInt(agentsResult.rows[0]?.count || '0');
    
    // Get active reports count from previous month
    const reportsQuery = `
      SELECT COUNT(*) as count
      FROM daily_reports
      WHERE date >= $1 AND date <= $2
    `;
    const reportsResult = await pool.query(reportsQuery, [prevMonthStart, prevMonthEnd]);
    const reports = parseInt(reportsResult.rows[0]?.count || '0');
    
    // Get help requests count from previous month
    const helpRequestsQuery = `
      SELECT COUNT(*) as count
      FROM help_requests
      WHERE created_at >= $1 AND created_at <= $2 AND resolved = false
    `;
    const helpRequestsResult = await pool.query(helpRequestsQuery, [prevMonthStart, prevMonthEnd]);
    const helpRequestsCount = parseInt(helpRequestsResult.rows[0]?.count || '0');
    
    res.json({
      managers,
      agents,
      reports,
      helpRequests: helpRequestsCount
    });
  } catch (error) {
    console.error('Error fetching previous month stats:', error);
    res.status(500).json({ error: 'Failed to fetch previous month statistics' });
  }
});

export default router; 