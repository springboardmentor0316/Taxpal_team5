const mongoose = require('mongoose');
const dns = require('dns');

const DEFAULT_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

const parseDnsServers = () => {
  const { MONGODB_DNS_SERVERS } = process.env;

  if (!MONGODB_DNS_SERVERS) {
    return DEFAULT_DNS_SERVERS;
  }

  const servers = MONGODB_DNS_SERVERS.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  return servers.length > 0 ? servers : DEFAULT_DNS_SERVERS;
};

const shouldRetryWithFallbackDns = (error) => {
  if (!error || !error.code || !error.syscall) {
    return false;
  }

  const retryableCodes = new Set(['ETIMEOUT', 'ENODATA', 'ENOTFOUND']);
  const dnsSyscalls = new Set(['queryTxt', 'querySrv']);

  return retryableCodes.has(error.code) && dnsSyscalls.has(error.syscall);
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  let attemptedDnsFallback = false;
  const resolveConnection = async () => {
    try {
      const connection = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      return connection;
    } catch (error) {
      if (!attemptedDnsFallback && shouldRetryWithFallbackDns(error)) {
        attemptedDnsFallback = true;
        try {
          dns.setServers(parseDnsServers());
          console.warn('MongoDB DNS lookup failed; retrying with fallback DNS servers');
        } catch (dnsError) {
          console.warn('Failed to set fallback DNS servers', dnsError);
        }

        return resolveConnection();
      }

      throw error;
    }
  };

  const connection = await resolveConnection();

  console.log(`MongoDB connected: ${connection.connection.host}`);
};

module.exports = connectDB;
