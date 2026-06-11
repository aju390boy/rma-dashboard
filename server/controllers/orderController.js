const Order = require('../models/Order');
const User = require('../models/User');

// GET /api/orders — paginated, filterable, sortable
const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      payment_status,
      user_id,
      search,
      customerName,   // NEW: search by customer name
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (status) filter.status = { $in: status.split(',') };
    if (payment_status) filter.payment_status = { $in: payment_status.split(',') };
    if (user_id) filter.user_id = user_id;
    if (search) filter.order_number = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Customer name search: find matching user IDs first
    if (customerName && customerName.trim()) {
      const matchingUsers = await User.find(
        { name: { $regex: customerName.trim(), $options: 'i' } },
        '_id'
      ).lean();
      filter.user_id = { $in: matchingUsers.map((u) => u._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user_id', 'name email role wallet_balance')
        .populate('rma.reviewed_by', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user_id', 'name email role wallet_balance')
      .populate('rma.reviewed_by', 'name email');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    res.json({ success: true, data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/orders/stats — dashboard KPIs
const getStats = async (req, res) => {
  try {
    const [statusBreakdown, recentActivity, totalRevenue] = await Promise.all([
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Order.find({ status: { $in: ['RETURN_REQUESTED', 'REFUND_INITIATED'] } })
        .populate('user_id', 'name email')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
      Order.aggregate([
        { $match: { payment_status: 'PAID' } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const counts = {};
    statusBreakdown.forEach((s) => { counts[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        statusBreakdown: counts,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalPaidOrders: totalRevenue[0]?.count || 0,
        pendingReturns: counts['RETURN_REQUESTED'] || 0,
        recentActivity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/orders/analytics — rich charts data
const getAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      dailyOrders,
      dailyRevenue,
      returnReasons,
      statusTrend,
      topProducts,
      refundStats,
    ] = await Promise.all([

      // Daily order volume — last 30 days
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            returns: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'REFUND_INITIATED', 'REFUNDED']] },
                  1, 0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Daily revenue — last 30 days
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, payment_status: 'PAID' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total_amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top return reasons
      Order.aggregate([
        { $match: { 'rma.return_reason': { $ne: null, $exists: true } } },
        { $group: { _id: '$rma.return_reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 7 },
      ]),

      // Status distribution (pie chart)
      Order.aggregate([
        { $group: { _id: '$status', value: { $sum: 1 } } },
        { $sort: { value: -1 } },
      ]),

      // Top 5 most returned products
      Order.aggregate([
        { $match: { status: { $in: ['RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUNDED'] } } },
        { $unwind: '$products' },
        { $group: { _id: '$products.name', count: { $sum: 1 }, revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Refund stats
      Order.aggregate([
        { $match: { status: 'REFUNDED' } },
        {
          $group: {
            _id: null,
            totalRefunded: { $sum: '$rma.refund_amount' },
            count: { $sum: 1 },
            avgRefund: { $avg: '$rma.refund_amount' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        dailyOrders,
        dailyRevenue,
        returnReasons: returnReasons.map((r) => ({ reason: r._id, count: r.count })),
        statusDistribution: statusTrend.map((s) => ({ name: s._id, value: s.value })),
        topReturnedProducts: topProducts.map((p) => ({ name: p._id, returns: p.count, revenue: p.revenue })),
        refundStats: refundStats[0] || { totalRefunded: 0, count: 0, avgRefund: 0 },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getOrders, getOrderById, getStats, getAnalytics };
