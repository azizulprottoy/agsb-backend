module.exports = ({
  UserCollection,
  DivisionCollection,
  DistrictCollection,
  BlogCollection,
  TravelPlanCollection,
  PartnerCollection,
  MembershipPlanCollection,
  FrameCollection,
  ContactMessageCollection,
}) => ({
  getDashboard: async (req, res) => {
    try {
      const [
        totalUsers,
        totalDivisions,
        totalDistricts,
        totalBlogPosts,
        totalTravelPlans,
        totalPartners,
        totalMembershipPlans,
        totalFrames,
        totalContactMessages,
        newContactMessages,
      ] = await Promise.all([
        UserCollection.countDocuments(),
        DivisionCollection.countDocuments(),
        DistrictCollection.countDocuments(),
        BlogCollection.countDocuments(),
        TravelPlanCollection.countDocuments(),
        PartnerCollection.countDocuments(),
        MembershipPlanCollection.countDocuments(),
        FrameCollection.countDocuments(),
        ContactMessageCollection.countDocuments(),
        ContactMessageCollection.countDocuments({ status: 'new' }),
      ]);

      const recentUsers = await UserCollection
        .find()
        .project({ passwordHash: 0 })
        .sort({ _id: -1 })
        .limit(5)
        .toArray();

      const recentMessages = await ContactMessageCollection
        .find()
        .sort({ _id: -1 })
        .limit(5)
        .toArray();

      res.json({
        totalUsers,
        totalDivisions,
        totalDistricts,
        totalBlogPosts,
        totalTravelPlans,
        totalPartners,
        totalMembershipPlans,
        totalFrames,
        totalContactMessages,
        newContactMessages,
        recentUsers,
        recentMessages,
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
    }
  },
});
