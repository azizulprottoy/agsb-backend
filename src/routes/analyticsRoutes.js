const { asyncRouter } = require('../utils/asyncRouter');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// CC Events view-only dashboard link for the admin sidebar. Served by the API
// (CC_EVENTS_DASHBOARD_URL) instead of the admin bundle because the link
// itself grants access to the analytics.
module.exports = () => {
  const router = asyncRouter();

  router.get('/admin/events-dashboard-link', verifyToken, requireAdmin, (req, res) => {
    res.json({ success: true, url: process.env.CC_EVENTS_DASHBOARD_URL || null });
  });

  return router;
};
