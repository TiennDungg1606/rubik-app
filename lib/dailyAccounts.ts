// List of Daily.co API keys for round-robin/random selection
export const dailyAccounts = [
  {
    apiKey: process.env.DAILY_API_KEY_1 || '',
    accountName: 'Account 1',
  },
  {
    apiKey: process.env.DAILY_API_KEY_2 || '',
    accountName: 'Account 2',
  },
  // Add more accounts as needed
];
