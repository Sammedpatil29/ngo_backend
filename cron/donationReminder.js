const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Donor = require('../models/donor');
const Donation = require('../models/donation');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'sammed.patil29@gmail.com',
    pass: process.env.EMAIL_PASS || 'dxjw yrxh vpox ndtx'
  }
});

const sendReminderEmail = async () => {
  console.log('Starting donation reminder job...');
  try {
    const donors = await Donor.findAll();

    if (!donors || donors.length === 0) {
      console.log('No donors found to send reminders.');
      return;
    }

    for (const donor of donors) {
      if (donor.email) {
        // Find the last completed donation for this donor
        const lastDonation = await Donation.findOne({
          where: { email: donor.email, paymentStatus: 'completed' },
          order: [['createdAt', 'DESC']]
        });

        if (!lastDonation) continue;

        const lastDonationDate = new Date(lastDonation.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if the last donation was recent (e.g., within the last 20 days)
        // If so, skip sending a reminder to avoid spamming immediately after a donation
        const diffTime = today - lastDonationDate;
        const diffDaysSinceDonation = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDaysSinceDonation < 20) continue;

        const targetDay = lastDonationDate.getDate();
        const currentMonthTarget = new Date(today.getFullYear(), today.getMonth(), targetDay);
        const nextMonthTarget = new Date(today.getFullYear(), today.getMonth() + 1, targetDay);
        const prevMonthTarget = new Date(today.getFullYear(), today.getMonth() - 1, targetDay);

        const isWithinWindow = (target) => Math.abs((today - target) / (1000 * 60 * 60 * 24)) <= 3;

        if (!isWithinWindow(currentMonthTarget) && !isWithinWindow(nextMonthTarget) && !isWithinWindow(prevMonthTarget)) {
          continue;
        }

        const mailOptions = {
          from: process.env.EMAIL_USER || 'sammed.patil29@gmail.com',
          to: donor.email,
          subject: 'Your Support Matters - May I Help You Foundation',
          html: `
            <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anek+Telugu:wght@400;700&family=Luckiest+Guy&display=swap" rel="stylesheet">
<link href="https://fonts.cdnfonts.com/css/cooper-black" rel="stylesheet">

<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); background-color: #ffffff;">
  
  <div style="background-color: white; padding: 25px 30px; text-align: center; border-bottom: 2px solid #fce4ec;">
    <img src="https://storage.googleapis.com/may-i-help-you-foundation.firebasestorage.app/1772039322429-upload.png" alt="May I Help You Foundation Logo" style="width: 100px; height: auto; margin-bottom: 10px; border-radius: 50%;">
    
    <h1 style="font-family: 'Cooper Black', serif; color: #D81B60; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">
      May I Help You Foundation
    </h1>
  </div>

  <div style="padding: 40px; color: #333; line-height: 1.6;">
    <h2 style="color: #D81B60; margin-top: 0; font-family: 'Segoe UI', sans-serif;">
      Hello ${donor.name || 'Supporter'},
    </h2>
    
    <p style="font-size: 16px;">We hope this email finds you well.</p>
    
    <p style="font-size: 16px;">Your past contributions have helped us make a significant impact in the lives of many. We are writing to share that our mission continues, and your support is more vital than ever.</p>
    
    <p style="font-size: 18px; font-family: 'Anek Telugu', sans-serif; color: #D81B60; text-align: center; margin: 25px 0; font-weight: bold;">
      "సేవయే మా లక్ష్యం"
    </p>

    <p style="font-size: 16px;">If you are in a position to help again, please consider making a donation to support our ongoing initiatives.</p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="https://mayihelpyoufoundation.org/donation" style="background-color: #D81B60; color: white; padding: 15px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-family: 'Cooper Black', sans-serif; font-size: 18px; display: inline-block; box-shadow: 0 4px 10px rgba(216, 27, 96, 0.3);">
        Donate Now
      </a>
    </div>

    <p style="font-size: 16px;">Thank you for being a part of our family.</p>
    
    <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
      <p style="margin: 0; font-weight: bold;">Best Regards,</p>
      <p style="margin: 5px 0; color: #D81B60; font-weight: bold; font-size: 18px; font-family: 'Cooper Black', sans-serif;">
        Team May I Help You Foundation
      </p>
    </div>
  </div>

  <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
    <p style="margin: 0;">This email was sent to you because you have previously supported our foundation.</p>
    <p style="margin: 5px 0;">© 2026 May I Help You Foundation</p>
  </div>
</div>
          `
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`Reminder email sent to ${donor.email}`);
        } catch (err) {
          console.error(`Failed to send email to ${donor.email}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('Error in donation reminder job:', error);
  }
};

// Schedule the cron job to run every day at 10:00 AM
cron.schedule('0 10 * * *', sendReminderEmail);