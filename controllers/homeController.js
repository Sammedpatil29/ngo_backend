const Banner = require('../models/bannerModel');
const Service = require('../models/serviceModel');
const TeamMember = require('../models/teamMemberModel');
const News = require('../models/newsModel');

exports.getHomeData = async (req, res) => {
  try {
    const [banners, services, teamMembers, news] = await Promise.all([
      Banner.findAll(),
      Service.findAll(),
      TeamMember.findAll(),
      News.findAll()
    ]);

    res.status(200).json({
      banners,
      services,
      teamMembers,
      news
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};