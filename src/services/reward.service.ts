import axios from 'axios';

const REWARD_URL = process.env.REWARD_URL || 'http://localhost:3000/payoutApplication';
const API_KEY = process.env.API_KEY || '';
const APP_ID = process.env.APP_ID || '';

export const sendRewards = async (sessionId: string, userRewards: { userId: string, amount: number }[]) => {
  try {
    const res = await axios.post(REWARD_URL, {
      sessionId,
      userRewardedList: userRewards
    }, {
      headers: {
        apiKey: API_KEY,
        appId: APP_ID,
        'Content-Type': 'application/json'
      }
    });
    return res.data;
  } catch (err) {
    console.error('Reward error:', err);
    return null;
  }
};
