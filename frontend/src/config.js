const config = {
  region: process.env.REACT_APP_AWS_REGION || 'eu-west-2',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3005',
  cognito: {
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || '',
    clientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '',
  },
};

export default config;
