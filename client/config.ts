interface Config {
    apiUrl: string;
  }
  
  const config: Config = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  };
  
  export default config;